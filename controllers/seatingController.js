const Seating = require('../models/Seating');
const User = require('../models/User');
const Event = require('../models/Event');
const logger = require('../logger');

const getUserSummary = async (userId) => {
  const user = await User.findOne({ userId }).select('firstName lastName');
  if (!user) return null;
  return {
    userId: user.userId,
    firstName: user.firstName,
    lastName: user.lastName
  };
};

const validateUserIds = async (userIds = []) => {
  const uniqueIds = Array.from(new Set(Array.isArray(userIds) ? userIds : []));
  if (uniqueIds.length === 0) return [];

  const users = await User.find({ userId: { $in: uniqueIds } }).select('userId');
  const foundIds = users.map((user) => user.userId);
  const invalidIds = uniqueIds.filter((id) => !foundIds.includes(id));
  if (invalidIds.length > 0) {
    throw new Error(`Invalid userIds: ${invalidIds.join(', ')}`);
  }

  return uniqueIds;
};

const buildPeopleForTable = async (people = []) => {
  const normalizedPeople = Array.isArray(people) ? people : [];
  const userIds = normalizedPeople.map((person) => person.userId).filter(Boolean);
  await validateUserIds(userIds);

  const seats = normalizedPeople.map((person) => {
    if (!person.seat) {
      throw new Error('Each seating entry must include a seat number');
    }
    return {
      userId: person.userId || '',
      role: ['guest', 'vip', 'none'].includes(person.role) ? person.role : 'none',
      seat: person.seat.toString()
    };
  });

  const seatValues = seats.map((entry) => entry.seat);
  const duplicateSeats = seatValues.filter((seat, index) => seatValues.indexOf(seat) !== index);
  if (duplicateSeats.length > 0) {
    throw new Error(`Duplicate seat values found: ${Array.from(new Set(duplicateSeats)).join(', ')}`);
  }

  return seats;
};

const buildTableForCreate = async (table) => {
  const people = await buildPeopleForTable(table.people);
  const numberOfPeople = table.numberOfPeople !== undefined ? Number(table.numberOfPeople) : people.length;

  if (Number.isNaN(numberOfPeople) || numberOfPeople < 0) {
    throw new Error('numberOfPeople must be a non-negative number');
  }
  if (numberOfPeople < people.length) {
    throw new Error(`numberOfPeople cannot be less than people count for table ${table.tableNumber || ''}`);
  }

  return {
    tableNumber: table.tableNumber?.toString() || '',
    numberOfPeople,
    people
  };
};

const buildTableForUpdate = async (table, existingTable = {}) => {
  const people = table.people === undefined ? existingTable.people || [] : await buildPeopleForTable(table.people);
  const numberOfPeople = table.numberOfPeople !== undefined
    ? Number(table.numberOfPeople)
    : existingTable.numberOfPeople ?? people.length;

  if (Number.isNaN(numberOfPeople) || numberOfPeople < 0) {
    throw new Error('numberOfPeople must be a non-negative number');
  }
  if (numberOfPeople < people.length) {
    throw new Error(`numberOfPeople cannot be less than people count for table ${existingTable.tableNumber || table.tableNumber || ''}`);
  }

  return {
    tableNumber: existingTable.tableNumber || table.tableNumber?.toString() || '',
    numberOfPeople,
    people
  };
};

const seatingResponse = async (seating) => {
  if (!seating) return null;

  const userIds = Array.from(new Set(
    seating.tables.flatMap((table) => table.people.map((person) => person.userId))
  ));

  const users = await User.find({ userId: { $in: userIds } }).select('userId firstName lastName');
  const userMap = users.reduce((map, user) => {
    map[user.userId] = user;
    return map;
  }, {});

  const tableData = seating.tables.map((table) => ({
    tableNumber: table.tableNumber,
    numberOfPeople: table.numberOfPeople ?? table.people.length,
    people: table.people.map((person) => {
      const user = userMap[person.userId];
      return {
        userId: person.userId,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        role: person.role || 'none',
        seat: person.seat
      };
    })
  }));

  return {
    seatingId: seating.seatingId,
    eventId: seating.eventId,
    tables: tableData,
    createdAt: seating.createdAt,
    updatedAt: seating.updatedAt
  };
};

const updateTableInSeating = async (seating, tableNumber, people, numberOfPeople) => {
  const existingTableIndex = seating.tables.findIndex((table) => table.tableNumber === tableNumber);
  const existingTable = existingTableIndex === -1 ? {} : seating.tables[existingTableIndex];
  const updatedTable = await buildTableForUpdate({ people, numberOfPeople }, existingTable);

  if (existingTableIndex === -1) {
    seating.tables.push(updatedTable);
  } else {
    seating.tables[existingTableIndex] = updatedTable;
  }

  await seating.save();
  return seating;
};

exports.createSeating = async (req, res) => {
  try {
    const { eventId, tables } = req.body;
    if (!eventId) {
      return res.status(400).json({ statusCode: 400, message: 'eventId is required' });
    }

    const eventExists = await Event.findOne({ eventId });
    if (!eventExists) {
      return res.status(404).json({ statusCode: 404, message: 'Event not found' });
    }

    const processedTables = await Promise.all((Array.isArray(tables) ? tables : []).map(async (table) =>
      buildTableForCreate(table)
    ));

    const seating = await Seating.create({ eventId, tables: processedTables });
    await logger({ level: 'INFO', message: `Seating created for event ${eventId}`, service: 'seating-service' });
    const response = await seatingResponse(seating);
    res.status(201).json({ statusCode: 201, message: 'Seating created successfully', data: response });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Create seating failed: ${error.message}`, service: 'seating-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

exports.updateSeatingTable = async (req, res) => {
  try {
    const { seatingId, tableNumber } = req.params;
    const { people, numberOfPeople } = req.body;
    const seating = await Seating.findOne({ seatingId });
    if (!seating) {
      return res.status(404).json({ statusCode: 404, message: 'Seating not found' });
    }

    const updatedSeating = await updateTableInSeating(seating, tableNumber, people, numberOfPeople);
    await logger({ level: 'INFO', message: `Seating updated for table ${tableNumber} in seating ${seatingId}`, service: 'seating-service' });
    const response = await seatingResponse(updatedSeating);
    res.status(200).json({ statusCode: 200, message: 'Seating table updated successfully', data: response });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Update seating table failed: ${error.message}`, service: 'seating-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

exports.updateSeatingTableByEvent = async (req, res) => {
  try {
    const { eventId, tableNumber } = req.params;
    const { people, numberOfPeople } = req.body;
    const seating = await Seating.findOne({ eventId });
    if (!seating) {
      return res.status(404).json({ statusCode: 404, message: 'Seating not found for event' });
    }

    const updatedSeating = await updateTableInSeating(seating, tableNumber, people, numberOfPeople);
    await logger({ level: 'INFO', message: `Seating updated for table ${tableNumber} in event ${eventId}`, service: 'seating-service' });
    const response = await seatingResponse(updatedSeating);
    res.status(200).json({ statusCode: 200, message: 'Seating table updated successfully', data: response });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Update seating table by event failed: ${error.message}`, service: 'seating-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

exports.getSeatingByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const seating = await Seating.findOne({ eventId });
    if (!seating) {
      return res.status(404).json({ statusCode: 404, message: 'Seating not found' });
    }

    const response = await seatingResponse(seating);
    await logger({ level: 'INFO', message: `Retrieved seating for event ${eventId}`, service: 'seating-service' });
    res.status(200).json({ statusCode: 200, data: response });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get seating failed: ${error.message}`, service: 'seating-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

exports.getSeatingById = async (req, res) => {
  try {
    const { seatingId } = req.params;
    const seating = await Seating.findOne({ seatingId });
    if (!seating) {
      return res.status(404).json({ statusCode: 404, message: 'Seating not found' });
    }

    const response = await seatingResponse(seating);
    await logger({ level: 'INFO', message: `Retrieved seating ${seatingId}`, service: 'seating-service' });
    res.status(200).json({ statusCode: 200, data: response });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Get seating by id failed: ${error.message}`, service: 'seating-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

exports.deleteSeating = async (req, res) => {
  try {
    const { seatingId } = req.params;
    const seating = await Seating.findOneAndDelete({ seatingId });
    if (!seating) {
      return res.status(404).json({ statusCode: 404, message: 'Seating not found' });
    }

    await logger({ level: 'INFO', message: `Deleted seating ${seatingId}`, service: 'seating-service' });
    res.status(200).json({ statusCode: 200, message: 'Seating deleted successfully' });
  } catch (error) {
    await logger({ level: 'ERROR', message: `Delete seating failed: ${error.message}`, service: 'seating-service' });
    res.status(500).json({ statusCode: 500, message: error.message });
  }
};

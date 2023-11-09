const FileHistory = require('../../models/FileHistory');
const connectDB = require('../../db');
const fs = require('fs');

const MIGRATION_LOG_FILE = 'add_assignedReciever_filehistory_logs_down.json';

let successfulMigrationCount = 0;
let unSuccessFullMigrationCount = 0;
let documentProcessed = 0;

let migrationEventLogStream;

const CONFIG = {
  migrationLogTypes: {
    error: 'error',
    completed: 'completed',
    failed: 'failed',
  },
};

class LogManager {
  constructor(type, document, msg) {
    this.type = type;
    this.document = document;
    this.message = msg;
  }

  async writeLog() {
    const data = {
      type: this.type,
      document: this.document,
      message: this.message,
    };
    migrationEventLogStream.write(JSON.stringify(data) + ',' + '\n');
  }
}

class MigrationHandler {
  constructor(fileHistory) {
    this.fileHistory = fileHistory;
  }

  async deleteAssignedReciever() {
    try {
      this.fileHistory.assignedReciever = undefined;
      await this.fileHistory.save();
    } catch (err) {
      new LogManager(
        'ERROR_REMOVING_FIELD',
        this.fileHistory,
        err.message
      ).writeLog();

      throw err;
    }
  }
  async startTransaction() {
    try {
      await this.deleteAssignedReciever();
      await this.handleSuccess();
    } catch (err) {
      throw err;
    }
  }

  async handleError(err) {
    console.log({ err });
    unSuccessFullMigrationCount++;
    await new LogManager(
      CONFIG.migrationLogTypes.error,
      this.fileHistory,
      JSON.stringify(err.message || {})
    ).writeLog();
  }

  async handleSuccess() {
    successfulMigrationCount++;
    await new LogManager(
      CONFIG.migrationLogTypes.completed,
      this.fileHistory,
      `Successfully migrated Signers doc of id ${this.fileHistory._id.toString()}`
    ).writeLog();
  }
}

async function migrationDown() {
  const isFileExists = fs.existsSync(MIGRATION_LOG_FILE);

  if (isFileExists) {
    fs.truncateSync(MIGRATION_LOG_FILE, 0, err => {
      if (err) {
        console.log('Could not truncate the event file');
      } else {
        console.log('Successfully truncate the event file');
      }
    });
  }

  migrationEventLogStream = fs.createWriteStream(MIGRATION_LOG_FILE, {
    flags: 'a',
  });
  migrationEventLogStream.write('[\n');

  const fileHistoryCursor = FileHistory.find({}).batchSize(500).cursor();

  for await (doc of fileHistoryCursor) {
    documentProcessed++;
    console.log(' Processing document number ==>', documentProcessed, '\n');
    const migrationHandler = new MigrationHandler(doc);
    try {
      await migrationHandler.startTransaction();
    } catch (err) {
      await migrationHandler.handleError(err);
    }
  }

  migrationEventLogStream.write(
    JSON.stringify({ documentProcessed }) + ',' + '\n'
  );
  migrationEventLogStream.write(
    JSON.stringify({ successfulMigrationCount }) + ',' + '\n'
  );
  migrationEventLogStream.write(
    JSON.stringify({ unSuccessFullMigrationCount }) + '\n'
  );
  migrationEventLogStream.write('\n]', err => {
    if (err) {
      console.log('Error while closing array');
    } else {
      console.log('Success at closing array');
    }
    process.exit(0);
  });
}

migrationDown();

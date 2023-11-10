const { default: mongoose, Types } = require('mongoose');
const fs = require('fs');
const SignerModel = require('../../models/Signer.model');
const FileHistory = require('../../models/FileHistory');
const connectDB = require('../../db');

const CONFIG = {
  migrationLogTypes: {
    error: 'error',
    completed: 'completed',
    failed: 'failed',
  },
};

connectDB(); // Initialize DB

const MIGRATION_LOG_FILE = 'add_assignedReciever_filehistory_logs_up.json';

let successfulMigrationCount = 0;
let unSuccessFullMigrationCount = 0;
let documentProcessed = 0;

let migrationEventLogStream;

class LogManager {
  constructor(type, signerDocument, msg) {
    this.type = type;
    this.signerDocument = signerDocument;
    this.message = msg;
  }

  async writeLog() {
    const data = {
      type: this.type,
      signerDocument: this.signerDocument,
      message: this.message,
    };
    migrationEventLogStream.write(JSON.stringify(data) + ',' + '\n');
  }
}

class MigrationHandler {
  constructor(signerDetail) {
    this.signerDetail = signerDetail;
  }

  async getFileHistory(fileStatus) {
    try {
      const fileHisory = await FileHistory.findOne({
        _id: Types.ObjectId(fileStatus),
      });
      return fileHisory;
    } catch (err) {
      new LogManager(
        'GET_FILEHISTORY_ERROR',
        this.signerDetail,
        JSON.stringify(err.message || {})
      ).writeLog();
      return null;
    }
  }

  async startTransaction() {
    const signers = this.signerDetail.signers;

    try {
      for (const signer of signers) {
        if (signer.fileStatus) {
          const fileHisory = await this.getFileHistory(signer.fileStatus);
          if (fileHisory) {
            let option = {};

            if (signer.userId) {
              option.userId = signer.userId;
            } else if (!signer.userId && signer.emailColumnId) {
              option.emailColumnId = signer.emailColumnId;
            }

            fileHisory.assignedReciever = option;
            fileHisory.markModified('assignedReciever');
            await fileHisory.save();
          }
        }
      }
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
      this.signerDetail,
      JSON.stringify(err.message || {})
    ).writeLog();
  }

  async handleSuccess() {
    successfulMigrationCount++;
    await new LogManager(
      CONFIG.migrationLogTypes.completed,
      this.signerDetail,
      `Successfully migrated Signers doc of id ${this.signerDetail._id.toString()}`
    ).writeLog();
  }
}

async function startMigration() {
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

  const signerDetailCursor = SignerModel.find({}).batchSize(500).cursor();

  for await (doc of signerDetailCursor) {
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

startMigration();

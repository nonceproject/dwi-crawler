import AWS from 'aws-sdk';
import { logger } from 'jege/server';

import { Record } from './types';

const log = logger('[crawler]');

AWS.config.update({ region: 'us-west-2' });

const db = new AWS.DynamoDB();

function addProps(src, tar) {
  Object.keys(src)
    .forEach((key) => {
      if (src[key]) {
        tar[key] = {
          S: typeof src[key] === 'string' ? src[key] : JSON.stringify(src[key]),
        };
      }
    });
}

export async function write(record: Record) {
  const now = Date.now().toString();
  const params = {
    Item: {
      id: {
        S: record.ensName,
      },
      updated_at: {
        S: now,
      },
    },
    TableName: 'crawl-2',
  };

  addProps(record, params.Item);
  return new Promise((resolve, reject) => {
    db.putItem(params, function(err, data) {
      if (err) {
        log('write(): err: %s', err);
        reject();
      } else {
        log('write(): completed writing, now: %s, ensName: %s, resolverAddr: %s',
            now, record.ensName, record.resolverAddr);
        resolve();
      }
    });
  })
}

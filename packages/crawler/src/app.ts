import axios from 'axios';
import cheerio from 'cheerio';
import lineReader from 'line-reader';
import { logger } from 'jege/server';
import Web3 from 'web3';

import * as db from './dynamodb';
import { Record } from './types';

const log = logger('[crawler]');

const ZERO = '0x0000000000000000000000000000000000000000';

const config = require(process.env.CONFIG_PATH as string);
const keywordsPath = process.env.KEYWORDS_PATH as string;

const InfuraEndpoint = {
  http: `https://mainnet.infura.io/v3/${config.INFURA_APIKEY}`,
  ipfs: `https://ipfs.infura.io:5001/api/v0`,
  wss: `wss://mainnet.infura.io/ws/v3/${config.INFURA_APIKEY}`,
};

const InterfaceId = {
  addr: '0x3b3b57de',
  contentHash: '0xbc1c58d1',
};

const web3 = new Web3(InfuraEndpoint.http);

function removeMarkup(str: string) {
  return str.replace(/(<([^>]+)>)/ig, '');
}

async function getTransactionRecords(resolver, record: Record) {
  const currentBlock = await web3.eth.getBlockNumber();

  const transactions = await resolver.getPastEvents('allEvents', {
    fromBlock: currentBlock - 1000, toBlock: 'latest' });

  const latestTransactions = transactions.slice(-5);
  record.latestTransactions = latestTransactions;
}

async function getContentDocument(contentHash, record: Record) {
  const url = `${InfuraEndpoint.ipfs}/object/get?arg=${contentHash}`;
  try {
    const { data } = await axios.get(url);
    const contentLinks = data.Links;

    if (data.Data) {
      let parsedData = data.Data;
      if (/<\/?[a-z][\s\S]*>/i.test(data.Data)) {
        try {
          parsedData = removeMarkup(cheerio.load(data.Data)('body').text());
        } catch (err) {
          log('getContentDocument() html parsing error: %s', err);
        }
      }
      record.contentDocument = parsedData;
    }

    if (contentLinks) {
      record.contentLinks = data.Links;
      for (let i = 0; i < contentLinks.length; i += 1) {
        const link = contentLinks[i];
        if (link.Name === 'index.html') {
          const indexHtmlUrl = `${InfuraEndpoint.ipfs}/object/get?arg=${link.Hash}`;
          const { data: indexHtml } = await axios.get(indexHtmlUrl);
          const $ = cheerio.load(indexHtml.Data);
          record.contentTitle = $('title').text();
          record.contentDocument = $('body').text().substring(0, 1800);
          break;
        }
      }
    }
  } catch (err) {
    log('getContentDocument(): error retrieving: %s', err);
  }
}

async function getEns(name: string) {
  const ensName =`${name}.eth`;

  try {
    const record: Record = {
      addr: undefined,
      contentDocument: undefined,
      contentHash: undefined,
      contentLinks: undefined,
      contentTitle: undefined,
      ensName,
      latestTransactions: undefined,
      resolverAddr: undefined,
    };
    const reecordDoesExist = await web3.eth.ens.recordExists(ensName);
    if (reecordDoesExist) {
      const resolver = await web3.eth.ens.getResolver(ensName);
      if (resolver.options.address === ZERO) {

      } else {
        record.resolverAddr = resolver.options.address;
        try {
          const hasAddr = await web3.eth.ens.supportsInterface(ensName, InterfaceId.addr);
          if (hasAddr) {
            const addr = await web3.eth.ens.getAddress(ensName);
            record.addr = addr;
            await getTransactionRecords(resolver, record);
          }
        } catch (err) {
          log('getEns(): supportsInterface or getAddress failed, contractAddress: %s', resolver.options.address);
          throw err;
        }

        const hasContentHash = await web3.eth.ens.supportsInterface(
          ensName, InterfaceId.contentHash);
        if (hasContentHash) {
          const contentHash = await web3.eth.ens.getContenthash(ensName);
          if (contentHash.decoded !== null) {
            record.contentHash = contentHash.decoded;

            await getContentDocument(contentHash.decoded, record);
          }
        }
      }
    }
    return record
  } catch (err) {
    log('getEns(): error retrieving ens data: %s', err);
    throw err;
  }
}

function getNextLine(reader, cb) {
  if (reader.hasNextLine()) {
    reader.nextLine(async function(err, line) {
      try {
        if (err) throw err;
        const record = await getEns(line);
        await db.write(record);
      } catch (err) {
        log('main(): error reading next line: %o', err);
      }
      getNextLine(reader, cb);
    });
  } else {
    log('getNextLine(): no line anymore');
    cb();
  }
}

async function main() {
  log('main(): keywordsPath: %s', keywordsPath);
  lineReader.open(keywordsPath, function(err, reader) {
    if (err) throw err;

    getNextLine(reader, () => {
      log('main(): finish reading lines');
    });
  });
}

export default main;

import axios from 'axios';
import lineReader from 'line-reader';
import { logger } from 'jege/server';
import Web3 from 'web3';

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

async function getTransactionRecords(resolver, record: Record) {
  const currentBlock = await web3.eth.getBlockNumber();
  console.log('currentBlock: %s', currentBlock);

  const transactions = await resolver.getPastEvents('allEvents', {
    fromBlock: currentBlock - 1000, toBlock: 'latest' });

  const latestTransactions = transactions.slice(-5);
  record.latestTransactions.push(...latestTransactions);
}

async function getContentDocument(contentHash, record: Record) {
  const url = `${InfuraEndpoint.ipfs}/object/get?arg=${contentHash}`;
  try {
    const { data } = await axios.get(url);
    const contentLinks = data.Links;
    if (contentLinks) {
      record.contentLinks = data.Links;
      for (let i = 0; i < contentLinks.length; i += 1) {
        const link = contentLinks[i];
        if (link.Name === 'index.html') {
          const indexHtmlUrl = `${InfuraEndpoint.ipfs}/object/get?arg=${link.Hash}`;
          const { data: indexHtml } = await axios.get(indexHtmlUrl);
          // console.log(22, indexHtml.Data);
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

  const record: Record = {
    addr: undefined,
    contentDocument: undefined,
    contentHash: undefined,
    contentLinks: [],
    contentTitle: undefined,
    ensName,
    latestTransactions: [],
    resolverAddr: undefined,
  };
  const reecordDoesExist = await web3.eth.ens.recordExists(ensName);
  if (reecordDoesExist) {
    const resolver = await web3.eth.ens.getResolver(ensName);
    if (resolver.options.address === ZERO) {

    } else {
      const hasAddr = await web3.eth.ens.supportsInterface(ensName, InterfaceId.addr);
      if (hasAddr) {
        const addr = await web3.eth.ens.getAddress(ensName);
        record.addr = addr;
        await getTransactionRecords(resolver, record);
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

  log('getEns(): saving a record: %j', record);
}

function getNextLine(reader, cb) {
  if (reader.hasNextLine()) {
    reader.nextLine(async function(err, line) {
      try {
        if (err) throw err;
        await getEns(line);
        getNextLine(reader, cb);
      } catch (err) {
        log('main(): error reading next line: %o', err);
      }
    });
  } else {
    log('getNextLine(): no line anymore');
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

interface Record {
  addr?: string;
  contentDocument?: string;
  contentHash?: string;
  contentLinks: {
    Name: string;
    Hash: string;
    Size: number;
  }[];
  contentTitle?: string;
  ensName: string;
  latestTransactions: string[];
  resolverAddr?: string;
}
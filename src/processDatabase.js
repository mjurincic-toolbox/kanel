import chalk from 'chalk';
import knex from 'knex';
import rmfr from 'rmfr';
import fs from 'fs';
import { pluck, reject } from 'ramda';
import { extractSchema } from 'extract-pg-schema';
import generateModelFiles from './generateModelFiles';
import generateTypeFiles from './generateTypeFiles';

const defaultTypeMap = {
  int2: 'number',
  int4: 'number',
  float4: 'number',
  numeric: 'number',
  bool: 'boolean',
  json: 'unknown',
  jsonb: 'unknown',
  char: 'string',
  varchar: 'string',
  text: 'string',
  date: 'Date',
  time: 'Date',
  timetz: 'Date',
  timestamp: 'Date',
  timestamptz: 'Date',
};

const processDatabase = async ({
  connection,
  sourceCasing = 'snake',
  filenameCasing = 'pascal',
  preDeleteModelFolder = false,
  customTypeMap = {},
  schemas,
}) => {
  const typeMap = { ...defaultTypeMap, ...customTypeMap };

  console.log(
    `Connecting to ${chalk.greenBright(connection.database)} on ${
      connection.host
    }`
  );
  const knexConfig = {
    client: 'pg',
    connection,
  };
  const db = knex(knexConfig);

  for (const schema of schemas) {
    if (preDeleteModelFolder) {
      console.log(` - Clearing old files in ${schema.modelFolder}`);
      await rmfr(schema.modelFolder, { glob: true });
    }
    if (!fs.existsSync(schema.modelFolder)) {
      fs.mkdirSync(schema.modelFolder);
    }

    const { tables, views, types } = await extractSchema(schema.name, db);
    const rejectIgnored = reject(m => (schema.ignore || []).includes(m.name))

    await generateTypeFiles(
      types,
      schema.modelFolder,
      sourceCasing,
      filenameCasing
    );

    await generateModelFiles(
      rejectIgnored(tables),
      rejectIgnored(views),
      typeMap,
      pluck('name', types),
      schema.modelFolder,
      sourceCasing,
      filenameCasing
    );
  }
};

export default processDatabase;

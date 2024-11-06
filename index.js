const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const whois = require('whois-json');

const inputFile = 'domaines.csv';
const outputFile = 'resultats.csv';
const batchSize = 100;
const delayBetweenBatches = 5000; // 5 secondes
const maxRetries = 3;

const csvWriter = createCsvWriter({
  path: outputFile,
  header: [
    { id: 'domaine', title: 'Domaine' },
    { id: 'email1', title: 'Email 1' },
    { id: 'email2', title: 'Email 2' },
    { id: 'email3', title: 'Email 3' },
  ],
  append: true,
});

const extractEmails = (whoisData) => {
  const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
  const allText = JSON.stringify(whoisData);
  return [...new Set(allText.match(emailRegex) || [])];
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const processDomainsFile = async () => {
  let batch = [];
  let processedCount = 0;
  let totalCount = 0;

  const stream = fs.createReadStream(inputFile).pipe(csv());

  for await (const row of stream) {
    totalCount++;
    batch.push(row.domaine);

    if (batch.length === batchSize) {
      processedCount += await processBatch(batch);
      batch = [];
      await sleep(delayBetweenBatches);
    }
  }

  if (batch.length > 0) {
    processedCount += await processBatch(batch);
  }

  console.log(`Traitement terminé. ${processedCount} domaines traités sur ${totalCount}.`);
};

const processBatch = async (batch) => {
  const results = [];

  for (const domaine of batch) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const whoisData = await whois(domaine);
        const emails = extractEmails(whoisData);
        results.push({
          domaine,
          email1: emails[0] || '',
          email2: emails[1] || '',
          email3: emails[2] || '',
        });
        console.log(`Traité: ${domaine}`);
        break;
      } catch (error) {
        retries++;
        console.error(`Erreur lors du traitement de ${domaine} (tentative ${retries}/${maxRetries}):`, error);
        if (retries < maxRetries) {
          await sleep(1000 * retries); // Attente exponentielle entre les tentatives
        }
      }
    }
  }

  await csvWriter.writeRecords(results);
  console.log(`Lot de ${results.length} domaines écrit dans ${outputFile}`);
  return results.length;
};

processDomainsFile().catch(console.error);

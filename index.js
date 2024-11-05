const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const whois = require('whois-json');

const inputFile = 'domaines.csv';
const outputFile = 'resultats.csv';

const csvWriter = createCsvWriter({
  path: outputFile,
  header: [
    { id: 'domaine', title: 'Domaine' },
    { id: 'email1', title: 'Email 1' },
    { id: 'email2', title: 'Email 2' },
    { id: 'email3', title: 'Email 3' },
  ]
});

const extractEmails = (whoisData) => {
  const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
  const allText = JSON.stringify(whoisData);
  return [...new Set(allText.match(emailRegex) || [])];
};

const processDomainsFile = async () => {
  const results = [];
  const domains = [];

  // Lire tous les domaines
  await new Promise((resolve) => {
    fs.createReadStream(inputFile)
      .pipe(csv())
      .on('data', (row) => domains.push(row.domaine))
      .on('end', resolve);
  });

  // Traiter chaque domaine
  for (const domaine of domains) {
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
    } catch (error) {
      console.error(`Erreur lors du traitement de ${domaine}:`, error);
    }
  }

  // Écrire les résultats
  try {
    await csvWriter.writeRecords(results);
    console.log(`Résultats écrits dans ${outputFile}`);
  } catch (error) {
    console.error('Erreur lors de l\'écriture des résultats:', error);
  }
};

processDomainsFile();

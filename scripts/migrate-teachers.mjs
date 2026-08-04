#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

const serviceAccountPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('Missing service account JSON path. Pass as first arg or set GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

const mappingPath = process.argv[3] || path.join(process.cwd(), 'scripts', 'teacher-mapping.json');

try {
  const svc = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
} catch (err) {
  console.error('Failed to read or parse service account JSON:', err.message);
  process.exit(1);
}

const db = admin.firestore();

async function backupTeachers() {
  const snapshot = await db.collection('teachers').get();
  const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  const outDir = path.join(process.cwd(), 'scripts', 'backups');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `teachers-backup-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(docs, null, 2), 'utf8');
  console.log('Wrote backup to', outFile);
  return docs;
}

function loadMapping() {
  if (!fs.existsSync(mappingPath)) {
    const template = [
      {
        "teacherId": "", // fill this with the teacher document id OR leave empty to match by current username
        "currentUsername": "", // optional — current username/class-name used today
        "newUsername": "",
        "newClassIds": [],
        "permissions": [
          { "classId": "basic-1", "subjectIds": ["mathematics", "english-language"] }
        ]
      }
    ];
    fs.writeFileSync(mappingPath + '.example', JSON.stringify(template, null, 2));
    console.error(`No mapping file found. A template was created at ${mappingPath}.example — please edit it and re-run the script (or create ${mappingPath}).`);
    process.exit(1);
  }
  const txt = fs.readFileSync(mappingPath, 'utf8');
  return JSON.parse(txt);
}

async function applyMapping(mapping, teachers) {
  const byId = Object.fromEntries(teachers.map(t => [t.id, t]));
  const byUsername = Object.fromEntries(teachers.map(t => [String(t.username || '').toLowerCase(), t]));

  const batch = db.batch();
  let updates = 0;
  for (const m of mapping) {
    let found = null;
    if (m.teacherId) found = byId[m.teacherId];
    if (!found && m.currentUsername) found = byUsername[(m.currentUsername || '').toLowerCase()];
    if (!found) {
      console.warn('Mapping entry not matched to any teacher:', m);
      continue;
    }
    const ref = db.collection('teachers').doc(found.id);
    const updateData = {};
    if (m.newUsername) updateData.username = m.newUsername;
    if (Array.isArray(m.newClassIds)) updateData.classIds = m.newClassIds;
    if (Array.isArray(m.permissions)) updateData.permissions = m.permissions;
    if (Object.keys(updateData).length === 0) continue;
    batch.update(ref, updateData);
    updates++;
  }
  if (updates === 0) {
    console.log('No updates to apply. Nothing changed.');
    return;
  }
  await batch.commit();
  console.log(`Applied ${updates} teacher updates.`);
}

async function main() {
  console.log('Starting teacher migration. Backing up current teacher docs...');
  const teachers = await backupTeachers();
  const mapping = loadMapping();
  console.log('Loaded mapping entries:', mapping.length);
  await applyMapping(mapping, teachers);
  console.log('Migration complete. Verify changes in the Firebase console.');
  process.exit(0);
}

main().catch(err => { console.error('Migration failed:', err); process.exit(1); });

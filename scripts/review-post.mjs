// 사용: node scripts/review-post.mjs <원글pid> "<답글 본문>"   또는  node scripts/review-post.mjs --json replies.json ([{pid,text}])
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import fs from 'fs'
const key = JSON.parse(fs.readFileSync('_migration/keys/target-homepro-nexlabs.json', 'utf8'))
initializeApp({ credential: cert(key) }); const db = getFirestore()
const kstNow = () => { const d = new Date(Date.now() + 9 * 3600000); return d.toISOString().slice(0, 16).replace('T', ' ') }
const list = process.argv[2] === '--json' ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : [{ pid: process.argv[2], text: process.argv[3] }]
for (const { pid, text } of list) {
  const root = await db.collection('reviewThreads').doc(pid).get()
  if (!root.exists) { console.log('없음', pid); continue }
  await db.collection('reviewThreads').add({ screenId: root.data().screenId, by: '카스', text: String(text).trim(), replyTo: pid, at: kstNow(), ts: FieldValue.serverTimestamp() })
  console.log('답글', pid, root.data().screenId)
}

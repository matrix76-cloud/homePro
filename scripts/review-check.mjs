import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'fs'
const key = JSON.parse(fs.readFileSync('/Users/a1111/Downloads/2026Dev/mainproject/2026Web/homePro/_migration/keys/source-homepro-43f7f.json','utf8'))
initializeApp({ credential: cert(key) })
const db = getFirestore()
const snap = await db.collection('reviewThreads').orderBy('ts', 'asc').get()
const all = snap.docs.map(d => ({ pid: d.id, ...d.data() }))
const fmt = ts => { const d = ts?.toDate ? ts.toDate() : new Date(ts); return new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 16).replace('T', ' ') }
const since = new Date('2026-08-14T00:00:00+09:00').getTime()
const rows = all.map(t => ({ pid: t.pid, screenId: t.screenId, by: t.by, at: fmt(t.ts || t.at), text: t.text, replyTo: t.replyTo || null, imgs: (t.imgs || []).length, ms: (t.ts?.toDate ? t.ts.toDate() : new Date(t.at)).getTime() }))
const roots = rows.filter(r => !r.replyTo)
const replied = new Set(rows.filter(r => r.replyTo).map(r => r.replyTo))
const recent = roots.filter(r => r.ms >= since)
console.log('total', rows.length, 'roots', roots.length, 'roots since 8/14', recent.length)
for (const r of recent) {
  const reps = rows.filter(x => x.replyTo === r.pid)
  console.log(`\n[${r.at}] ${r.by} · ${r.screenId} · ${r.pid} ${reps.length ? '(답글 ' + reps.length + ')' : '(미답변)'}${r.imgs ? ' img' + r.imgs : ''}\n${r.text}`)
  for (const x of reps) console.log(`   ↳ [${x.at}] ${x.by}: ${x.text.slice(0, 160)}`)
}

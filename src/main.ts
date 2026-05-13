import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { firebaseConfig } from './firebase-config';

initializeApp(firebaseConfig);
const db = getFirestore();

const logEl = document.getElementById('log') as HTMLPreElement;
const log = (msg: string) => {
    logEl.textContent += msg + '\n';
    // eslint-disable-next-line no-console
    console.log(msg);
};

document.getElementById('run')!.addEventListener('click', async () => {
    logEl.textContent = '';
    try {
        log('1. Writing mre/child placeholder...');
        await setDoc(doc(db, 'mre/child'), { hello: 'world' });

        log('2. Writing mre/parent with `child` = DocumentReference("mre/child")...');
        await setDoc(doc(db, 'mre/parent'), { child: doc(db, 'mre/child') });

        log('3. Reading mre/parent via FirebaseFirestore.getDocument...');
        const result = await FirebaseFirestore.getDocument({ reference: 'mre/parent' });

        log('UNEXPECTED SUCCESS — bug appears to be fixed.');
        log('snapshot.data: ' + JSON.stringify(result.snapshot.data));
    } catch (err) {
        const e = err as Error;
        log('THREW: ' + e.name + ': ' + e.message);
        if (e.stack) log(e.stack);
    }
});

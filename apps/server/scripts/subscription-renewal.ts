import { getRenewalCandidates, sendRenewalEmail } from "../src/services/subscriptions";

const candidates = await getRenewalCandidates();
console.log(`Found ${candidates.length} subscription(s) due for renewal.`);

for (const sub of candidates) {
    try {
        await sendRenewalEmail(sub);
        console.log(`Renewal email sent: userId=${sub.userId} newspaperId=${sub.newspaperId}`);
    } catch (err) {
        console.error(`Failed to send renewal for userId=${sub.userId}:`, err);
    }
}

console.log("Renewal job complete.");
process.exit(0);

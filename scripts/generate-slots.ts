import { generateSlots } from "../lib/slots";

async function main() {
  const { created } = await generateSlots();
  console.log(`Generated ${created} new slots.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));

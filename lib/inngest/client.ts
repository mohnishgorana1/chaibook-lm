import { Inngest } from "inngest";

// Create a client to send and receive events
// "chaibook-lm" tumhare app ka ID hai jo Inngest dashboard me dikhega

export const inngest = new Inngest({ id: "chaibook-lm" });
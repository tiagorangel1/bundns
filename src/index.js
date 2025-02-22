import dnsPacket from 'dns-packet';
import { resolveDNS, DNS_TYPES } from './resolver.js';
import intercept from './intercept.js';

const PORT = 5353;

Bun.serve({
    port: PORT,
    routes: {
        "/query": {
            GET: async (req) => {
                try {
                    if ((process.env.ENV === "prod") && req.headers.host === process.env.CF_TUNNELS_KEY) {
                        return Response("Host header not set and ENV is prod. set ENV to dev to disable this requirement", { status: 403 });
                    }

                    const domain = new URL(req.url).searchParams.get('name');
                    const type = new URL(req.url).searchParams.get('type') || 'A';

                    if (!domain) {
                        return Response.json({ error: 'Missing domain name parameter' });
                    }

                    const results = await resolveDNS(domain, type);
                    return Response.json(results);
                } catch {
                    return Response.json({ error: 'Invalid request' });
                }
            },
            POST: async req => {
                try {
                    const incomingBuffer = Buffer.from(await req.arrayBuffer());
                    const parsed = dnsPacket.decode(incomingBuffer);

                    if (parsed.type !== 'query' || parsed.questions.length === 0) {
                        return new Response(dnsPacket.encode({
                            id: parsed.id,
                            type: 'response',
                            flags: dnsPacket.RCODE_FORMAT_ERROR,
                            questions: parsed.questions,
                            answers: []
                        }), {
                            status: 200,
                            headers: { "Content-Type": "application/dns-message" }
                        });
                    }

                    const question = parsed.questions[0];
                    const domain = question.name;
                    const type = question.type;
                    const typeNum = DNS_TYPES[type];

                    console.log(`${domain} ${type}`);

                    if (intercept[domain] && intercept[domain][type]) {
                        return new Response(dnsPacket.encode({
                            id: parsed.id,
                            type: 'response',
                            flags: 0,
                            questions: parsed.questions,
                            answers: intercept[domain][type]
                        }), {
                            status: 200,
                            headers: { "Content-Type": "application/dns-message" }
                        });
                    }

                    if (typeNum === undefined) {
                        return new Response(dnsPacket.encode({
                            id: parsed.id,
                            type: 'response',
                            flags: dnsPacket.RCODE_NOT_IMPLEMENTED,
                            questions: parsed.questions,
                            answers: []
                        }), {
                            status: 200,
                            headers: { "Content-Type": "application/dns-message" }
                        });
                    }

                    const results = await resolveDNS(domain, typeNum);

                    if (results.Status !== 0) {
                        const errorResponse = dnsPacket.encode({
                            id: parsed.id,
                            type: 'response',
                            flags: dnsPacket.RCODE_SERVER_FAILURE,
                            questions: parsed.questions,
                            answers: []
                        });

                        return new Response(errorResponse, {
                            status: 200,
                            headers: { "Content-Type": "application/dns-message" }
                        });
                    }


                    const answers = results.Answer.map(ans => ({
                        type: ans.type,
                        name: ans.name,
                        ttl: ans.TTL,
                        data: ans.data,
                    }));

                    let flags = 0;
                    if (results.RD) flags |= dnsPacket.RECURSION_DESIRED;
                    if (results.RA) flags |= dnsPacket.RECURSION_AVAILABLE;
                    if (results.AD) flags |= dnsPacket.AUTHENTIC_DATA;
                    if (results.CD) flags |= dnsPacket.CHECKING_DISABLED;
                    if (results.TC) flags |= dnsPacket.TRUNCATED_RESPONSE;

                    const responsePacket = dnsPacket.encode({
                        id: parsed.id,
                        type: 'response',
                        flags: flags,
                        questions: parsed.questions,
                        answers: answers,
                    });

                    return new Response(responsePacket, {
                        status: 200,
                        headers: { "Content-Type": "application/dns-message" }
                    });

                } catch (error) {
                    console.error("Error handling DNS request:", error);

                    return new Response(dnsPacket.encode({
                        id: 0,
                        type: 'response',
                        flags: dnsPacket.RCODE_SERVER_FAILURE,
                        questions: [],
                        answers: []
                    }), {
                        status: 200,
                        headers: { "Content-Type": "application/dns-message" }
                    });
                }
            },
        },
    },
    fetch() { return new Response(Bun.file("./src/index.html")) },
});

console.log(`DNS server running at http://localhost:${PORT}/`);
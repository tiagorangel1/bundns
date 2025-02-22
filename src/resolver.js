import dgram from 'dgram';
import { LRUCache } from 'lru-cache';
import dnsPacket from 'dns-packet';

const DNS_PROVIDER = '1.1.1.1';

const cache = new LRUCache({
    max: 1000,
    ttl: 1000 * 60 * 3
});

const DNS_TYPES = {
    A: 1, NS: 2, MD: 3, MF: 4, CNAME: 5, SOA: 6, MB: 7, MG: 8,
    MR: 9, NULL: 10, WKS: 11, PTR: 12, HINFO: 13, MINFO: 14, MX: 15,
    TXT: 16, RP: 17, AFSDB: 18, X25: 19, ISDN: 20, RT: 21, NSAP: 22,
    NSAP_PTR: 23, SIG: 24, KEY: 25, PX: 26, GPOS: 27, AAAA: 28, LOC: 29,
    NXT: 30, EID: 31, NIMLOC: 32, SRV: 33, ATMA: 34, NAPTR: 35, KX: 36,
    CERT: 37, A6: 38, DNAME: 39, SINK: 40, OPT: 41, APL: 42, DS: 43,
    SSHFP: 44, IPSECKEY: 45, RRSIG: 46, NSEC: 47, DNSKEY: 48, DHCID: 49,
    NSEC3: 50, NSEC3PARAM: 51, TLSA: 52, SMIMEA: 53, HIP: 55, NINFO: 56,
    RKEY: 57, TALINK: 58, CDS: 59, CDNSKEY: 60, OPENPGPKEY: 61, CSYNC: 62,
    ZONEMD: 63, SVCB: 64, HTTPS: 65, SPF: 99, UINFO: 100, UID: 101,
    GID: 102, UNSPEC: 103, NID: 104, L32: 105, L64: 106, LP: 107,
    EUI48: 108, EUI64: 109, TKEY: 249, TSIG: 250, IXFR: 251, AXFR: 252,
    MAILB: 253, MAILA: 254, ANY: 255, URI: 256, CAA: 257, AVC: 258,
    DOA: 259, AMTRELAY: 260, TA: 32768, DLV: 32769
};

function buildQuery(domain, type) {
    return dnsPacket.encode({
        type: 'query',
        id: Math.floor(Math.random() * 65536),
        flags: dnsPacket.RECURSION_DESIRED,
        questions: [{
            type: type in DNS_TYPES ? type : 'A',
            name: domain
        }]
    });
}

function parseResponse(buffer) {
    const decoded = dnsPacket.decode(buffer);

    const response = {
      Status: decoded.rcode === 'NOERROR' ? 0 : 1, //  simplified status
      TC: decoded.flags & dnsPacket.TRUNCATED_RESPONSE,
      RD: !!(decoded.flags & dnsPacket.RECURSION_DESIRED),
      RA: !!(decoded.flags & dnsPacket.RECURSION_AVAILABLE),
      AD: !!(decoded.flags & dnsPacket.AUTHENTIC_DATA),
      CD: !!(decoded.flags & dnsPacket.CHECKING_DISABLED),
      Question: decoded.questions.map(q => ({ name: q.name, type: q.type })),
      Answer: decoded.answers.map(a => ({ name: a.name, type: a.type, TTL: a.ttl, data: a.data })),
    };
    return response;
}

async function resolveDNS(domain, type = 'A', timeout = 5000) {
    if (typeof type === 'number') type = Object.entries(DNS_TYPES).find(arg => arg[1] === type)[0];

    const cacheKey = `${domain}:${type}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    return new Promise((resolve, reject) => {
        const socket = dgram.createSocket('udp4');
        const query = buildQuery(domain, type);
        let timer;
        let handled = false;

        const handle = (err, res) => {
            if (handled) return;
            handled = true;
            clearTimeout(timer);
            socket.close();
            err ? reject(err) : resolve(res);
        };

        socket.once('message', msg => {
            const res = parseResponse(msg);
            //Corrected caching to look for any TTL in the answers array.
            const ttl = res.Answer.reduce((acc, curr) => Math.min(acc, curr.TTL), Infinity) * 1000
            if (ttl > 0) {
              cache.set(cacheKey, res, ttl);
            }

            handle(null, res);
        });

        socket.once('error', handle);
        timer = setTimeout(() => handle(new Error('DNS resolution timeout')), timeout);

        socket.send(query, 53, DNS_PROVIDER, err => {
            if (err) handle(err);
        });
    });
}

export { resolveDNS, DNS_TYPES };
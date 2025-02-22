import { expect, test, describe } from "bun:test";
import { resolveDNS } from './resolver.js';

const RESPONSE_CODES = {
    NOERROR: 0,
    FORMERR: 1,
    SERVFAIL: 2,
    NXDOMAIN: 3,
    NOTIMP: 4,
    REFUSED: 5
};

const DNS_RECORDS = "A,NS,MD,MF,CNAME,SOA,MB,MG,MR,NULL,WKS,PTR,HINFO,MINFO,MX,TXT,RP,AFSDB,X25,ISDN,RT,NSAP,NSAP_PTR,SIG,KEY,PX,GPOS,AAAA,LOC,NXT,EID,NIMLOC,SRV,ATMA,NAPTR,KX,CERT,A6,DNAME,SINK,OPT,APL,DS,SSHFP,IPSECKEY,RRSIG,DNSKEY,DHCID,NSEC3PARAM,TLSA,SMIMEA,HIP,NINFO,RKEY,TALINK,CDS,CDNSKEY,OPENPGPKEY,CSYNC,ZONEMD,SVCB,HTTPS,SPF,UINFO,UID,GID,UNSPEC,NID,L32,L64,LP,EUI48,EUI64,TKEY,TSIG,MAILB,MAILA,URI,CAA,AVC,DOA,AMTRELAY,TA,DLV".split(",");

describe("valid domains with all record types", () => {
    DNS_RECORDS.forEach(type => {
        test(`should resolve a valid domain with ${type} record`, async () => {
            const result = await resolveDNS('example.com', type);

            if (!(result.Status === RESPONSE_CODES.NOERROR || result.Status === RESPONSE_CODES.NOTIMP)) {
                console.log("FAIL", result);
            }

            expect(result).toBeDefined();
            expect(result.Status === RESPONSE_CODES.NOERROR || result.Status === RESPONSE_CODES.NOTIMP).toBe(true);
            expect(result.Status).toBe(0);
            expect(result.Answer).toBeDefined();

            if (result.Answer[0]) {
                expect(result.Answer[0]).toHaveProperty('name');
                expect(result.Answer[0]).toHaveProperty('type');
                expect(result.Answer[0]).toHaveProperty('TTL');
                expect(result.Answer[0]).toHaveProperty('data');
            }
        });
    });
});

// we're using A record here as an example, since it's not worth using
// all records as that slows down the test suite a lot
test(`should error out on invalid domain with A record`, async () => {
    const result = await resolveDNS('example.invalid', "A");

    expect(result.Status === RESPONSE_CODES.NOERROR || result.Status === RESPONSE_CODES.NOTIMP).toBe(false);
});

// we're using A, AAAA, MX, NS records here since they're present on almost
// all domains and that way we prevent false positives
describe("valid domains contain answer with common record types", () => {
    ["A", "AAAA", "MX", "NS"].forEach(type => {
        test(`should return valid answer with a valid domain with ${type} record`, async () => {
            const result = await resolveDNS('example.com', type);

            expect(result).toBeDefined();
            expect(result.Status === RESPONSE_CODES.NOERROR || result.Status === RESPONSE_CODES.NOTIMP).toBe(true);
            expect(result.Status).toBe(0);
            expect(result.Answer).toBeDefined();
            expect(result.Answer[0]).toBeDefined();
            expect(result.Answer[0]).toHaveProperty('name');
            expect(result.Answer[0]).toHaveProperty('type');
            expect(result.Answer[0]).toHaveProperty('TTL');
            expect(result.Answer[0]).toHaveProperty('data');
        });
    });
});
import cbor from 'cbor'

const headerLabels = {
    "4": {
        name: "kind",
        parse: function(value) {
            return value;
        }
    },
    "1": {
        name: "alg",
        parse: function(value) {
            switch(value) {
                case "-7": return "ECDSA_w_SHA256";
                case "-8": return "EdDSA";
                case "-35": return "ECDSA_w_SHA384";
                case "-36": return "ECDSA_w_SHA512";
                case "-257": return "RSASSA-PKCS1-v1_5_w_SHA256";
                case "-258": return "RSASSA-PKCS1-v1_5_w_SHA384";
                case "-259": return "RSASSA-PKCS1-v1_5_w_SHA512";
                case "-65535": return "RSASSA-PKCS1-v1_5_w_SHA1";
                default: return value;
            }
        }
    }
}

const payloadLabels = {
    "1": {
        name: "iss",
        parse: v => v.toString()
    },
    "4": {
        name: "exp",
        parse: v => v
    },
    "5": {
        name: "nbf",
        parse: v => v
    },
    "7": {
        name: "jti",
        parse: v => Array.from(v)
    }
}

function parseHeader(parsedCose) {
    const headerCbor = parsedCose.value[0];
    if(!(headerCbor instanceof Uint8Array)) {
        throw new Error("Invalid header");
    }
    
    const parsedHeader = cbor.decode(headerCbor);
    if(!(parsedHeader instanceof Map)) {
        throw new Error("Invalid decoded header");
    }

    let header = {};
    for (let kv of parsedHeader) {
        let key = kv[0].toString();
        let value = kv[1].toString();

        let item = headerLabels[key];
        if(item) {
            header[item.name] = item.parse(value);
        }
    }

    return Promise.resolve(header);
}

function parsePayload(parsedCose) {
    var parsedPayload = cbor.decode(parsedCose.value[2]);

    let payload = {};
    for (let kv of parsedPayload) {
        let key = kv[0].toString();
        let value = kv[1];

        let item = payloadLabels[key];
        if(item) {
            payload[item.name] = item.parse(value);
        } else {
            payload[key] = value;
        }
    }
    return Promise.resolve(payload);
}


function parseSignature(parsedCose, key, header, payload) {
    var notBefore = new Date(payload.nbf);
    var expires = new Date(payload.exp);
    var now = new Date();

    if(notBefore < now || now > expires) {
        const keyId = payload.iss + "#" + header.kind;
        const publicKey = key.verificationMethod.find(vm => vm.id === keyId);
        if(publicKey) {
            return validateSignature(parsedCose, publicKey.publicKeyJwk);
        }
    }

    return Promise.resolve({
        valid: false,
        sig: []
    });
}

function validateSignature(parsedCose, key) {
    let valid = false;
    if(parsedCose.tag === 18)
    {
        const header = parsedCose.value[0];
        const plaintext = parsedCose.value[2];
        const externalAAD = key.externalAAD || Buffer.alloc(0);
        const SigStructure = [
            'Signature1',
            header,
            externalAAD,
            plaintext
          ];
        const sig = cbor.encode(SigStructure);
        
        return crypto.subtle.importKey("jwk", key, {name: "ECDSA",namedCurve: "P-256"}, false, ["verify"])
            .then(publicKey => crypto.subtle.verify({
                    name: "ECDSA",
                    hash: {name: "SHA-256"},
                }, 
                publicKey,
                parsedCose.value[3],
                sig)
            )
            .then(valid => {return {
                valid,
                sig: parsedCose.value[3]
            }})
    }

    Promise.resolve({
        valid,
        sig: []
    });
}

function parseCose(cose, key) {
    var parsedCose;
    try {
        parsedCose = cbor.decode(cose);
        if(parsedCose.err) {
            throw parsedCose.err;
        }
        
        return Promise.all([
            parseHeader(parsedCose),
            parsePayload(parsedCose)]
        ).then(r => { 
            const [header, payload] = r;

            return parseSignature(parsedCose, key, header, payload)
                .then(signature => { 
                    return {
                        header, 
                        payload, 
                        signature
                    }
                });
        });

    } catch (err) {
        throw new Error("Error parsing cose: " + err);
    }
}

const exports = {
    parseCose
}
export default exports;
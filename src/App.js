import React, { useState } from 'react'
import QrReader from 'react-qr-reader'
import base32Decode from 'base32-decode';
import cose from './cose'
import { Container, Card, Col, Row } from 'react-bootstrap';

function App(key) {
  const header = "NZCP:/1/";
  //const data = 'NZCP:/1/2KCEVIQEIVVWK6JNGEASNICZAEP2KALYDZSGSZB2O5SWEOTOPJRXALTDN53GSZBRHEXGQZLBNR2GQLTOPICRUYMBTIFAIGTUKBAAUYTWMOSGQQDDN5XHIZLYOSBHQJTIOR2HA4Z2F4XXO53XFZ3TGLTPOJTS6MRQGE4C6Y3SMVSGK3TUNFQWY4ZPOYYXQKTIOR2HA4Z2F4XW46TDOAXGG33WNFSDCOJONBSWC3DUNAXG46RPMNXW45DFPB2HGL3WGFTXMZLSONUW63TFGEXDALRQMR2HS4DFQJ2FMZLSNFTGSYLCNRSUG4TFMRSW45DJMFWG6UDVMJWGSY2DN53GSZCQMFZXG4LDOJSWIZLOORUWC3CTOVRGUZLDOSRWSZ3JOZSW4TTBNVSWISTBMNVWUZTBNVUWY6KOMFWWKZ2TOBQXE4TPO5RWI33CNIYTSNRQFUYDILJRGYDVAYFE6VGU4MCDGK7DHLLYWHVPUS2YIDJOA6Y524TD3AZRM263WTY2BE4DPKIF27WKF3UDNNVSVWRDYIYVJ65IRJJJ6Z25M2DO4YZLBHWFQGVQR5ZLIWEQJOZTS3IQ7JTNCFDX';
  const [result, setResult] = useState({});
  //const keyRequest = fetch('https://nzcp.identity.health.nz/.well-known/did.json');
  //const keyRequest = fetch('https://nzcp.covid19.health.nz/.well-known/did.json');
  const keyRequest = fetch('/.well-known/did.json');

  // useEffect(() => {
  //   decode(data)
  // }, [])

  function addBase32Padding(base32InputNoPadding) {
    var result = base32InputNoPadding;
    while ((result.length % 8) !== 0) {
      result += '='
    }
    return result;
  }

  function decode(data) {
    if (!data) return;
    try
    {
      const encoded = data.replace(header, '');
      const decoded = base32Decode(addBase32Padding(encoded), "RFC4648");

      keyRequest
        .then(response => response.json())
        .then(pk => cose.parseCose(decoded, pk))
        .then(r => setResult(r));
    }
    catch(err)
    {
      console.log(err);
    }
  }

  function handleScan(data) {
    if (data) {
      if(data.startsWith(header))
      {
        decode(data);
      }
    }
  }

  function handleError(err) {
    console.error(err);
  }

  function StartCard(data) {
    return (<Card>
      <Card.Header>
      <h5 class="card-title">NZ Covid Cert</h5>
      </Card.Header>
      <Card.Body>
        <p>Please scan the QR Code</p>
      </Card.Body>
    </Card>)
  }

  function DisplayValue(props) {
    return(
      <div className="ms-2 me-auto">
        {props.label}
        <div className="fw-bold">{props.value}</div>
      </div>
    )
  }

  function ValidCard(props) {
    const details = props.payload.vc.credentialSubject;
    const name = details.givenName + " " + details.familyName;
    const dob = details.dob;
    return (<Card bg="success" text="white">
      <Card.Header>
        <h5 class="card-title">Valid Certificate</h5>
      </Card.Header>
      <Card.Body>
          <DisplayValue label="Name" value={name} ></DisplayValue>
          <DisplayValue label="Date of Birth" value={dob} ></DisplayValue>
      </Card.Body>
    </Card>)
  }

  function InvalidCard() {
    return (<Card bg="danger" text="white">
      <Card.Header>
        <h5 class="card-title">Invalid Certificate</h5>
      </Card.Header>
      <Card.Body>
          <p>This certificate is invalid. Please do not accept it.</p>
      </Card.Body>
    </Card>)
  }

  function InfoCard(props) {
    if(props.data && props.data.signature) {
      if(props.data.signature.valid) {
        return ValidCard(props.data);
      } else {
        return InvalidCard(props.data);
      }
    }

    return StartCard(props.data);
  }

  return (
    <Container>
      <Row>
        <Col md={6}>
          <QrReader
            delay={300}
            onError={handleError}
            onScan={handleScan}
            style={{ width: '100%' }}
          />
        </Col>
        <Col md={6}>
          <InfoCard data={result} />
        </Col>
      </Row>
    </Container>
  );
}

export default App;

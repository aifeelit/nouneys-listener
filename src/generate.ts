import fs from "fs";
import path from 'path';
import { NFTStorage, Blob } from "nft.storage";
import { shuffle } from "shuffle-seed";
import output from "../output.json";

const metadataDir = path.join(__dirname, '../../dist/metadata');

const client = new NFTStorage({
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGJkYzg0MkVmRmQwZWYyMDY4ZEMxQzhiQjlDNUEzMzZhNTJENDcyNmYiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY1OTk2NjE4NzYxOCwibmFtZSI6InVwbG9hZCJ9.sm0gMQ3MkGdBGNhrlI4HPBBf7s_0ChFDq_Xc7bFC644",
});

(async () => {
  // final output
  const final = shuffle(output.data, "⌐◨-◨");

  // get the data
  for (let i = 0; i < final.length; i += 1) {
    const tokenId = i + 1;
    // get image file name from dropbox
    const file = await fs.promises.readFile(
      `/Users/tpae/Dropbox/Season 1/${final[i].image}`
    );
    const cid = await client.storeBlob(new Blob([file]));

    const finalJSON = final[i];
    finalJSON.image = `https://nftstorage.link/ipfs/${cid}`;
    finalJSON.name = `The Nouneys #${tokenId}`;

    fs.writeFileSync(
      `${metadataDir}/${tokenId}.json`,
      JSON.stringify(finalJSON, null, 2)
    );

    console.log('tokenId: ', tokenId);
  }
})();
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { providers } from "ethers";
import Queue from "bee-queue";
import Redis from "ioredis";
import { Nouneys__factory } from "@nouneys/ethereum";

class RedisClient extends Redis {
  constructor(redisUrl: string) {
    super(redisUrl, {
      enableAutoPipelining: true,
    });
  }
}

const provider = new providers.AlchemyWebSocketProvider(
  "homestead",
  process.env.ALCHEMY_URL!.split("/").pop()
);

const client = new S3Client({
  region: "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.BUCKET_NAME;

const mintQueue = new Queue("mint", {
  redis: new RedisClient(process.env.REDIS_URL!),
});

const nouneys = Nouneys__factory.connect(
  process.env.CONTRACT_ADDRESS!,
  provider
);

async function uploadToS3(key: string, file: any, contentType: string) {
  return client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );
}

mintQueue.on("ready", async () => {
  console.log("mint queue ready");

  const mintEvent = nouneys.filters["Transfer(address,address,uint256)"](
    "0x0000000000000000000000000000000000000000"
  );

  // fetching existing logs
  const logs = await nouneys.queryFilter(mintEvent);

  console.log('logs found...', logs);

  // create jobs
  for (const log of logs) {
    const tokenId = log.args.tokenId.toString();
    console.log(tokenId);
    await mintQueue.createJob({ tokenId }).setId(tokenId).retries(7).save();
  }

  // start listener
  nouneys.on(mintEvent, async (_from: any, _to: any, tokenIdBn: any) => {
    const tokenId = tokenIdBn.toString();
    await mintQueue.createJob({ tokenId }).setId(tokenId).retries(7).save();
  });
});

mintQueue.on("succeeded", (job) => {
  console.log(`Token ID ${job.id} succeeded`);
});

mintQueue.on("failed", (job, err) => {
  console.log(`Token ID: ${job.id} failed with error ${err.message}`);
});

mintQueue.checkStalledJobs(5000, (err, numStalled) => {
  // prints the number of stalled jobs detected every 5000 ms
  if (numStalled > 0) {
    console.log("Found stalled job(s), re-enqueuing...", numStalled);
  }
});

// process job
mintQueue.process(async (job) => {
  const { tokenId } = job.data;
  try {
    const metadata = await import(`../metadata/${tokenId.toString()}.json`);

    // upload
    await uploadToS3(
      tokenId,
      JSON.stringify(metadata.default),
      "application/json"
    );
  } catch (e: any) {
    return Promise.reject(new Error(e.message));
  }

  return { status: "done" };
});

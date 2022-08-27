"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const ethers_1 = require("ethers");
const bee_queue_1 = __importDefault(require("bee-queue"));
const ioredis_1 = __importDefault(require("ioredis"));
const ethereum_1 = require("@nouneys/ethereum");
class RedisClient extends ioredis_1.default {
    constructor(redisUrl) {
        super(redisUrl, {
            enableAutoPipelining: true,
        });
    }
}
const provider = new ethers_1.providers.AlchemyWebSocketProvider("homestead", process.env.ALCHEMY_URL.split("/").pop());
const client = new client_s3_1.S3Client({
    region: "us-west-2",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET = process.env.BUCKET_NAME;
const mintQueue = new bee_queue_1.default("mint", {
    redis: new RedisClient(process.env.REDIS_URL),
});
const nouneys = ethereum_1.Nouneys__factory.connect(process.env.CONTRACT_ADDRESS, provider);
function uploadToS3(key, file, contentType) {
    return __awaiter(this, void 0, void 0, function* () {
        return client.send(new client_s3_1.PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: file,
            ContentType: contentType,
        }));
    });
}
mintQueue.on("ready", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("mint queue ready");
    const mintEvent = nouneys.filters["Transfer(address,address,uint256)"]("0x0000000000000000000000000000000000000000");
    // fetching existing logs
    const logs = yield nouneys.queryFilter(mintEvent);
    console.log('logs found...', logs);
    // create jobs
    for (const log of logs) {
        const tokenId = log.args.tokenId.toString();
        console.log(tokenId);
        yield mintQueue.createJob({ tokenId }).setId(tokenId).retries(7).save();
    }
    // start listener
    nouneys.on(mintEvent, (_from, _to, tokenIdBn) => __awaiter(void 0, void 0, void 0, function* () {
        const tokenId = tokenIdBn.toString();
        yield mintQueue.createJob({ tokenId }).setId(tokenId).retries(7).save();
    }));
}));
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
mintQueue.process((job) => __awaiter(void 0, void 0, void 0, function* () {
    const { tokenId } = job.data;
    try {
        const metadata = yield Promise.resolve().then(() => __importStar(require(`../metadata/${tokenId.toString()}.json`)));
        // upload
        yield uploadToS3(tokenId, JSON.stringify(metadata.default), "application/json");
    }
    catch (e) {
        return Promise.reject(new Error(e.message));
    }
    return { status: "done" };
}));

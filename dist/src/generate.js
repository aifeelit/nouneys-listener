"use strict";
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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const nft_storage_1 = require("nft.storage");
const shuffle_seed_1 = require("shuffle-seed");
const output_json_1 = __importDefault(require("../output.json"));
const metadataDir = path_1.default.join(__dirname, '../../dist/metadata');
const client = new nft_storage_1.NFTStorage({
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGJkYzg0MkVmRmQwZWYyMDY4ZEMxQzhiQjlDNUEzMzZhNTJENDcyNmYiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY1OTk2NjE4NzYxOCwibmFtZSI6InVwbG9hZCJ9.sm0gMQ3MkGdBGNhrlI4HPBBf7s_0ChFDq_Xc7bFC644",
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    // final output
    const final = (0, shuffle_seed_1.shuffle)(output_json_1.default.data, "⌐◨-◨");
    // get the data
    for (let i = 0; i < final.length; i += 1) {
        const tokenId = i + 1;
        // get image file name from dropbox
        const file = yield fs_1.default.promises.readFile(`/Users/tpae/Dropbox/Season 1/${final[i].image}`);
        const cid = yield client.storeBlob(new nft_storage_1.Blob([file]));
        const finalJSON = final[i];
        finalJSON.image = `https://nftstorage.link/ipfs/${cid}`;
        finalJSON.name = `The Nouneys #${tokenId}`;
        fs_1.default.writeFileSync(`${metadataDir}/${tokenId}.json`, JSON.stringify(finalJSON, null, 2));
        console.log('tokenId: ', tokenId);
    }
}))();

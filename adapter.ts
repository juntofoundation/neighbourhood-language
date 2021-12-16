import type { Address, Expression, ExpressionAdapter, PublicSharing, LanguageContext, AgentService, HolochainLanguageDelegate } from "@perspect3vism/ad4m";
import type { IPFS } from "ipfs-core-types";
import { s3, BUCKET_NAME } from "./config";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";
//import { DNA_NICK } from "./dna";
import axios from "axios";
import https from "https";

class SharedPerspectivePutAdapter implements PublicSharing {
  #agent: AgentService;
  //#hcDna: HolochainLanguageDelegate;
  #IPFS: IPFS;

  constructor(context: LanguageContext) {
    this.#agent = context.agent;
    //this.#hcDna = context.Holochain as HolochainLanguageDelegate;
    this.#IPFS = context.IPFS;
  }

  async createPublic(neighbourhood: object): Promise<Address> {
    // const expression = this.#agent.createSignedExpression(neighbourhood);
    
    // let resp = await this.#hcDna.call(
    //   DNA_NICK,
    //   "neighbourhood_store",
    //   "index_neighbourhood",
    //   expression
    // );
    // return resp.toString("hex");
    const agent = this.#agent;
    const expression = agent.createSignedExpression(neighbourhood);
    const content = JSON.stringify(expression);
    const result = await this.#IPFS.add(
      { content },
      { onlyHash: true },
    );
    const hash = result.cid.toString();

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    const postData = {
      hash,
      content,
    };
    const postResult = await axios.post("https://bi8fgdofma.execute-api.us-west-2.amazonaws.com/dev/serverlessSetup/upload", postData, { httpsAgent });
    if (postResult.status != 200) {
      console.error("Create neighbourhood error: ", postResult);
    }

    // @ts-ignore
    return hash as Address;
  }
}

async function streamToString(stream: Readable): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  })
}

export default class Adapter implements ExpressionAdapter {
  //#hcDna: HolochainLanguageDelegate;
  #IPFS: IPFS;

  putAdapter: PublicSharing;

  constructor(context: LanguageContext) {
    //this.#hcDna = context.Holochain as HolochainLanguageDelegate;
    this.#IPFS = context.IPFS;
    this.putAdapter = new SharedPerspectivePutAdapter(context);
  }

  async get(address: Address): Promise<Expression> {
    const cid = address.toString();

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    const getResult = await axios.get(`https://bi8fgdofma.execute-api.us-west-2.amazonaws.com/dev/flux-files/get?hash=${cid}`);
    if (getResult.status != 200) {
      console.error("Create neighbourhood error: ", getResult);
    }

    console.log("Create neighbourhood data: ", getResult.data);
    return JSON.parse(getResult.data);

    // const hash = Buffer.from(address, "hex");
    // const res = await this.#hcDna.call(
    //   DNA_NICK,
    //   "neighbourhood_store",
    //   "get_neighbourhood",
    //   hash
    // );
    // return res;
  }
}

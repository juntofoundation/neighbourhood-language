import type { Address, Expression, ExpressionAdapter, PublicSharing, LanguageContext, AgentService, HolochainLanguageDelegate } from "@perspect3vism/ad4m";
import type { IPFS } from "ipfs-core-types";
import { s3, BUCKET_NAME } from "./config";
import { GetObjectAclCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";
//import { DNA_NICK } from "./dna";

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

    const params = {
      Bucket: BUCKET_NAME,
      Key: hash,
      Body: content,
    };
    const _res = await s3.send(new PutObjectCommand(params));

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

    const params = {
      Bucket: BUCKET_NAME,
      Key: cid,
    };
    const data = await s3.send(new GetObjectAclCommand(params));
    //@ts-ignore
    const contents = await streamToString(data.Body as Readable);
    
    return JSON.parse(contents);

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

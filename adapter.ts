import type { Address, Expression, ExpressionAdapter, PublicSharing, LanguageContext, AgentService, HolochainLanguageDelegate } from "@perspect3vism/ad4m";
import type { IPFS } from "ipfs-core-types";
import axios from "axios";
import https from "https";
import { GET_ENDPOINT, UPLOAD_ENDPOINT } from "./config";

class SharedPerspectivePutAdapter implements PublicSharing {
  #agent: AgentService;
  #IPFS: IPFS;

  constructor(context: LanguageContext) {
    this.#agent = context.agent;
    this.#IPFS = context.IPFS;
  }

  async createPublic(neighbourhood: object): Promise<Address> {
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
    const postResult = await axios.post(UPLOAD_ENDPOINT, postData, { httpsAgent });
    if (postResult.status != 200) {
      console.error("Create neighbourhood error: ", postResult);
    }

    // @ts-ignore
    return hash as Address;
  }
}

export default class Adapter implements ExpressionAdapter {
  #IPFS: IPFS;

  putAdapter: PublicSharing;

  constructor(context: LanguageContext) {
    this.#IPFS = context.IPFS;
    this.putAdapter = new SharedPerspectivePutAdapter(context);
  }

  async get(address: Address): Promise<Expression> {
    const cid = address.toString();

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    const getResult = await axios.get(`${GET_ENDPOINT}?hash=${cid}`);
    if (getResult.status != 200) {
      console.error("Create neighbourhood error: ", getResult);
    }

    console.log("Create neighbourhood data: ", getResult.data);
    return getResult.data;
  }
}

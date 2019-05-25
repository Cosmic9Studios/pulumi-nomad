

import * as pulumi from "@pulumi/pulumi";
import axios from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';

interface NomadJobInputs {
    address: string, 
    hclJob: string,
    vars: Object,
    retryCount?: number
};

const nomadJobProvider: pulumi.dynamic.ResourceProvider = {
    async create(inputs: NomadJobInputs) {
        const id = await runJob(inputs);
        
        return { 
            id,
            outs: inputs
        };
    },

    async update(id, olds: NomadJobInputs, news: NomadJobInputs) {
        await runJob(news);
        return {
            id,
            outs: news
        }
    } 
}

export default class NomadJob extends pulumi.dynamic.Resource {
    constructor(name: string, args: NomadJobInputs, opts?: pulumi.CustomResourceOptions) {
        super(nomadJobProvider, name, args, opts);
    }
}

async function runJob(inputs: NomadJobInputs) {
    const hclJob = makeTemplate(inputs.hclJob, inputs.vars);
    const address = inputs.address;

    axiosRetry(axios, { 
        retries: inputs.retryCount || 3, 
        retryDelay: exponentialDelay,
        retryCondition: (err) => {
            if (err) {
                return true;
            }
            return false;
        }
    });

    const parseResponse = await axios.post(`${address}/v1/jobs/parse`, {JobHCL: hclJob});
    await axios.post(`${address}/v1/jobs`, { Job: parseResponse.data });

    return parseResponse.data.ID;
}

function makeTemplate(templateString: string, templateVariables: object) {
	const keys = Object.keys(templateVariables);
	const values = Object.values(templateVariables);
	let templateFunction = new Function(...keys, `return \`${templateString}\`;`);
	return templateFunction(...values);
}
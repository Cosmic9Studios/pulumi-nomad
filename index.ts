

import * as pulumi from "@pulumi/pulumi";
import axios from 'axios';

interface NomadJobInputs {
    address: string, 
    hclJob: string,
    vars: Object
};

const nomadJobProvider: pulumi.dynamic.ResourceProvider = {
    async create(inputs: NomadJobInputs) {
        pulumi.log.info("RUnning job ");
        const id = await runJob(inputs);
        
        return { 
            id,
            outs: {}
        };
    },
}

const delay = ms => new Promise(res => setTimeout(res, ms));

export default class NomadJob extends pulumi.dynamic.Resource {
    constructor(name: string, args: NomadJobInputs, opts?: pulumi.CustomResourceOptions) {
        super(nomadJobProvider, name, args, opts);
    }
}

function makeTemplate(templateString: string, templateVariables: object) {
	const keys = Object.keys(templateVariables);
	const values = Object.values(templateVariables);
	let templateFunction = new Function(...keys, `return \`${templateString}\`;`);
	return templateFunction(...values);
}

async function runJob(inputs: NomadJobInputs) {
    const hclJob = makeTemplate(inputs.hclJob, inputs.vars);
    const address = inputs.address;

    const parseResponse = await axios.post(`${address}/v1/jobs/parse`, {JobHCL: hclJob});
    await axios.post(`${address}/v1/jobs`, { Job: parseResponse.data });

    return parseResponse.data.ID;
}
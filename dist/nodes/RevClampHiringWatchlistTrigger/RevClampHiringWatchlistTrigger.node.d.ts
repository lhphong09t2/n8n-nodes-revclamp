import { type INodeExecutionData, type INodeType, type INodeTypeDescription, type IPollFunctions } from 'n8n-workflow';
export declare class RevClampHiringWatchlistTrigger implements INodeType {
    description: INodeTypeDescription;
    poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;
}

/**
 * Metadata object for example entries
 */
export interface ProdigyExampleMeta {
  score: number;
  section?: string;
}
export interface ProdigyExampleBase {
  id: number;
  input_hash: number;
  task_hash: number;
}
export interface ProdigyExampleRaw extends ProdigyExampleBase {
  content: Uint8Array;
}
/**
 * A prodigy dataset example
 */
export interface ProdigyExampleT<T extends ProdigyExampleMeta> extends ProdigyExampleBase {
  content: {
    text: string;
    answer: 'reject' | 'accept' | 'ignore';
    meta: T;
    '_input_hash': number;
    '_task_hash': number;
    label: string;
    score: number;
    priority: number;
    // TODO: Span types?
    spans: any[];
  };
}

/**
 * Non-generic utility for the basic case that has no special metadata.
 */
export type ProdigyExample = ProdigyExampleT<ProdigyExampleMeta>;

/**
 * Dataset entry from database
 */
export interface ProdigyDatasetRaw {
  id: number;
  name: string;
  created: number;
  session: number;
  meta: string;
}

/**
 * Dataset entry from database
 */
export interface ProdigyDataset {
  id: number;
  name: string;
  created: number;
  session: number;
  /**
   * Metadata object for dataset entries
   */
  meta: {
    description?: string;
    author?: string;
    created?: string;
  };
}

/** Link example entries to their datasets */
export interface ProdigyLink {
  id: number;
  dataset_id: number;
  example_id: number;
}
export type ReferenceSearchSource = 'all'|'nimh'|'icd'|'apa';
export type ReferenceSearchResult = {
 id:string;source:string;title:string;excerpt:string;url:string;page:number|null;kind:string;
};
export type ReferenceSearchResponse = {
 query:string;source:ReferenceSearchSource;total:number;offset:number;checkedOn:string;
 results:ReferenceSearchResult[];
 sources:{id:string;title:string;url:string;coverage:string;attribution:string}[];
};

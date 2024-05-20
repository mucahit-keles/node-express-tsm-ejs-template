export type IFilterByKeyValue = (array: { [key: string|number]: { [key: string]: any }} | Array<{ [key: string]: any }>, key: string, value: any) => { [key: string]: any } | [];
export function filterByKeyValue(array: { [key: string|number]: { [key: string]: any }} | Array<{ [key: string]: any }>, key: string, value: any): { [key: string]: any } | [] {
	if (typeof(array) === "object") array = Object.values(array);
	const filteredArray: Array<{ [key: string]: any }> = array.filter((item: any): boolean => (key in item) && item[key] === value);
	const result: { [key: string]: any } = filteredArray[0];
	
	return !result ? [] : result;
}
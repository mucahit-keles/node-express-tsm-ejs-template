import { Connection, ConnectionOptions, createConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

let dbConnection: Connection;

export async function getWrapper(connectionOptions: ConnectionOptions, timeZone?: string): Promise<IWrapper | undefined> {
	if (!dbConnection) {
		dbConnection = await createConnection(connectionOptions);
		if (timeZone) await dbConnection.execute("SET `time_zone` = ?", [ timeZone ]);
	}
	return new IWrapper();
}

type IQueryValue = string | number | Date;
type IDBColumn = { Field: string };

function mysql_real_escape_string(unsafeString: string): string {
	const safeString: string = dbConnection.escape(unsafeString);
	return safeString.substring(1, safeString.length - 1);
}

export class IWrapper {
	public async getData(query: string, params?: IQueryValue[]): Promise<RowDataPacket[]> {
		try {
			return (await dbConnection.execute(query, params))[0] as RowDataPacket[];
		} catch (e: any) {
			throw new Error(`getData Exception: ${e.message}`);
		}
	};
	public async getOneData(query: string, params?: IQueryValue[]): Promise<RowDataPacket | undefined> {
		try {
			const rows: RowDataPacket[] = await this.getData(`${query} LIMIT 1`, params);
			return rows.length === 0 ? undefined : rows[0];
		} catch (e: any) {
			throw new Error(e.message.replace("getData Exception:", "getOneData Exception:"));
		}
	};
	public async getColumns(tableName: string, excludedColumns?: string[]): Promise<string[]> {
		try {
			tableName = mysql_real_escape_string(tableName);
			
			let excludedColumns_params: Array<"?"> | undefined = excludedColumns ? new Array(excludedColumns.length).fill("?") : undefined;
			let excludedColumns_params_csv: string | undefined = excludedColumns_params ? excludedColumns_params.join(",") : undefined;
			
			const columns_queryParams: string = excludedColumns_params_csv ? ` WHERE \`Field\` NOT IN (${excludedColumns_params_csv})` : "";
			const columns: IDBColumn[] = await this.getData(`SHOW COLUMNS IN \`${tableName}\`${columns_queryParams}`, excludedColumns) as IDBColumn[];
			
			return columns.map((column: IDBColumn): string => column.Field) as string[];
		} catch (e: any) {
			throw new Error(e.message.replace("getData Exception:", "getColumns Exception:"));
		}
	};
	public async insertColumns(tableName: string, columns: string[] | string, insertAfter?: string, insertBefore?: string): Promise<void> {
		try {
			tableName = mysql_real_escape_string(tableName);
			
			if (typeof columns === "string") columns = [ columns ];
			for (let columnIndex: number = 0; columnIndex < columns.length; columnIndex++) {
				const column = columns[columnIndex];
				columns[columnIndex] = mysql_real_escape_string(column);
			}
			columns.reverse(); // to fix reversed insertion of columns
			
			let insertColumns_queryParams: string = insertAfter  ? ` AFTER \`${insertAfter}\`` : "";
			if (insertBefore) {
				const columns: string[] = await this.getColumns(tableName);
				let insertAfter_found: string;
				for (let columnIndex: number = 0; columnIndex < columns.length; columnIndex++) {
					const column: string = columns[columnIndex];
					if (column === insertBefore) {
						insertAfter_found = columns[columnIndex - 1];
						insertColumns_queryParams = insertAfter_found ? ` AFTER \`${insertAfter_found}\`` : "";
						break;
					}
				}
			}
			
			const columns_csv: string = " ADD COLUMN `" + columns.join(`\` VARCHAR(255)${insertColumns_queryParams}, ADD COLUMN \``) + `\` VARCHAR(255)${insertColumns_queryParams}`;
			
			await this.execute(`ALTER TABLE \`${tableName}\`${columns_csv}`);
		} catch (e: any) {
			throw new Error(e.message.replace("execute Exception:", "insertColumns Exception:"));
		}
	};
	public async execute(query: string, params?: IQueryValue[]): Promise<number> {
		try {
			return ((await dbConnection.execute(query, params))[0] as ResultSetHeader).insertId;
		} catch (e: any) {
			throw new Error(`execute Exception: ${e.message}`)
		}
	};
	public async insertRows(tableName: string, columns: string[], values: Array<(string | number | Date)[]>, noParams: boolean = false): Promise<void> {
		if (!Array.isArray(values)) values = [ values ];
		tableName = mysql_real_escape_string(tableName);
		const columns_csv: string = columns.join("`, `");
		const execValues: (string | number | Date)[] = [];
		
		const valuesArray: string[] = [];
		for (const value of values) {
			if (!noParams) {
				const params: Array<"?"> = new Array(value.length).fill("?");
				const params_csv: string = params.join(", ");
				valuesArray.push(`(${params_csv})`);
				execValues.push(...value);
			} else {
				const sanitizedValue: string[] = [];
				for (const unsafeValue of value) sanitizedValue.push(mysql_real_escape_string(unsafeValue.toString()));
				const sanitizedValue_csv: string = sanitizedValue.join("', '");
				valuesArray.push(`('${sanitizedValue_csv}')`); // if noParams is true, all values will be considered strings.
			}
		}
		const valuesArray_csv: string = valuesArray.join(", ");
		
		await this.execute(`INSERT INTO \`${tableName}\` (\`${columns_csv}\`) VALUES ${valuesArray_csv}`, !noParams ? execValues : undefined);
	};
}
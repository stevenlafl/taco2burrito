import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs-extra';
import * as path from 'path';

interface SchemaNode {
    type: string;
    attributes: Set<string>;
    children: { [key: string]: SchemaNode };
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    ignoreDeclaration: true,
});

function initSchemaNode(): SchemaNode {
    return {
        type: 'unknown',
        attributes: new Set(),
        children: {},
    };
}

function mergeSchemas(schema1: SchemaNode, schema2: SchemaNode): SchemaNode {
    const mergedSchema: SchemaNode = {
        type: schema1.type === schema2.type ? schema1.type : 'mixed',
        attributes: new Set([...schema1.attributes, ...schema2.attributes]),
        children: { ...schema1.children },
    };

    for (const [key, value] of Object.entries(schema2.children)) {
        if (key in mergedSchema.children) {
            mergedSchema.children[key] = mergeSchemas(mergedSchema.children[key], value);
        } else {
            mergedSchema.children[key] = value;
        }
    }

    return mergedSchema;
}

function deduceSchema(obj: any, schema: SchemaNode = initSchemaNode()): SchemaNode {
    if (typeof obj !== 'object' || obj === null) {
        schema.type = typeof obj;
        return schema;
    }

    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('@_')) {
            schema.attributes.add(key.slice(2));
        } else if (Array.isArray(value)) {
            schema.children[key] = value.reduce((s, item) => mergeSchemas(s, deduceSchema(item)), initSchemaNode());
        } else if (typeof value === 'object') {
            if (key in schema.children) {
                schema.children[key] = mergeSchemas(schema.children[key], deduceSchema(value));
            } else {
                schema.children[key] = deduceSchema(value);
            }
        } else {
            if (!(key in schema.children)) {
                schema.children[key] = initSchemaNode();
            }
            schema.children[key].type = typeof value;
        }
    }

    return schema;
}

async function processXmlFile(filePath: string, schema: SchemaNode): Promise<SchemaNode> {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = parser.parse(content);
    return deduceSchema(parsed, schema);
}

async function processDirectory(dirPath: string, schema: SchemaNode): Promise<SchemaNode> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            schema = await processDirectory(fullPath, schema);
        } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.xml') {
            schema = await processXmlFile(fullPath, schema);
        }
    }

    return schema;
}

function schemaToString(schema: SchemaNode, indent: string = ''): string {
    let result = `${indent}Type: ${schema.type}\n`;

    if (schema.attributes.size > 0) {
        result += `${indent}Attributes: ${Array.from(schema.attributes).join(', ')}\n`;
    }

    for (const [key, value] of Object.entries(schema.children)) {
        result += `${indent}${key}:\n`;
        result += schemaToString(value, indent + '  ');
    }

    return result;
}

async function main() {
    const rootDir = './packages'; // Change this to your root directory containing XML files
    let schema = initSchemaNode();

    try {
        schema = await processDirectory(rootDir, schema);
        console.log('Deduced XML Schema:');
        console.log(schemaToString(schema));
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

main();
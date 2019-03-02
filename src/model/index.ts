import {
    define,
    AWS,
    Model as DynogelModel,
    ModelConfiguration,
    CreateItemOptions,
    UpdateItemOptions
} from 'dynogels';

import { pascalCase, snakeCase } from 'change-case';
import uuidv4 = require('uuid/v4');
import pick = require('lodash.pick');
import pluralize = require('pluralize');

AWS.config.update({ region: 'eu-west-1' });

export class Model {

    protected static structure: ModelConfiguration;
    protected static table: string;
    public static dynogelModel: DynogelModel;
    protected static idColumn: string = 'id';
    protected static idSchema: string = 'uuid';
    protected static fillable: string[] = [];
    protected attributes: any = {};
    protected exists: boolean = false;

    ['constructor']: typeof Model;

    constructor(attributes: any = {}) {
        this.setAttributes(attributes);
    }

    public static init(structure: ModelConfiguration) {
        this.table = this.table || pluralize(snakeCase(this.name));
        this.dynogelModel = define(this.table, structure);
        this.structure = structure;
    }

    protected get self(): any {
        return this.constructor;
    }

    protected static toResult(resolve: any, reject: any) {
        return (err: any, result: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        };
    }

    protected static syncItem(resolve: any, reject: any, instance?: any) {
        return (err: any, result: any) => {
            if (err) {
                reject(err);
            } else {
                if (!result) {
                    resolve(null);
                }
                instance = instance || new this();
                instance.sync(result.attrs);
                resolve(instance);
            }
        };
    }

    protected static syncCollection(resolve: any, reject: any) {
        return (err: any, result: any) => {
            if (err) {
                reject(err);
            } else {
                let instances = [];
                if (result.Items && result.Items.length) {
                    instances = result.Items.map((item: any) => {
                        const instance = new this();
                        instance.sync(item.attrs);
                        return instance;
                    });
                }
                resolve(instances);
            }
        };
    }

    public static getAttributeFunctionGetter(attr: string): string {
        return `get${pascalCase(attr)}Attribute`;
    }

    public static getAttributeFunctionSetter(attr: string): string {
        return `set${pascalCase(attr)}Attribute`;
    }

    public static make(attributes: any): any {
        return new this(attributes);
    }

    public static makeMany(attributesCollection: any[]): any[] {
        return attributesCollection.map((attributes: any) => {
            return this.make(attributes);
        });
    }

    public static async create(attributes: any, options?: CreateItemOptions): Promise<any> {
        options = {
            ...{ overwrite: false },
            ...options
        };
        try {
            const instance = new this(attributes);
            await instance.save();
            return instance;
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public static async createMany(attributesCollection: any[], options?: CreateItemOptions): Promise<any> {
        return await Promise.all(
            attributesCollection.map((attributes: any) => {
                return this.create(attributes, options);
            })
        );
    }

    public static async update(attributes: any, options?: UpdateItemOptions): Promise<any> {
        try {
            const instance = await this.findByHashKey(attributes[this.idColumn]);
            await instance.update(attributes, options);
            return instance;
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public static findAll(): Promise<any> {
        return new Promise((resolve, reject) => {
            return this.dynogelModel.scan().loadAll().exec(this.syncCollection(resolve, reject))
        });
    }

    public static findByHashKey(key: any): Promise<any> {
        return new Promise((resolve, reject) => {
            return this.dynogelModel.get(key, this.syncItem(resolve, reject));
        });
    }

    public static async findByIndex(param: any, index: string): Promise<any> {
        try {
            const res = await this.findMultipleByIndex(param, index);
            return res[0] || null;
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public static findMultiple(params: any[], column: string = 'id'): Promise<any> {
        return new Promise((resolve, reject) => {
            return this.dynogelModel
                .scan()
                .where(column).in(params)
                .exec(this.syncCollection(resolve, reject))
        });
    }

    public static findMultipleByIndex(param: any, index: string): Promise<any> {
        return new Promise((resolve, reject) => {
            return this.dynogelModel
                .query(param)
                .usingIndex(index)
                .exec(this.syncCollection(resolve, reject))
        });
    }

    public static destroy(hashKey: any): Promise<any> {
        return new Promise((resolve, reject) => {
            return this
                .dynogelModel
                .destroy(hashKey, this.toResult(resolve, reject));
        });
    }

    public getAttribute(attr: string): any {
        if (this.existsAttributeFunctionGetter(attr)) {
            const that: any = this;
            return that[this.self.getAttributeFunctionGetter(attr)]();
        }
        return this.attributes[attr];
    }

    public getAttributes() {
        const attributes: any = {};
        Object.keys(this.attributes).forEach((attribute: any) => {
            attributes[attribute] = this.getAttribute(attribute)
        });
        return attributes;
    }

    public setAttribute(attr: string, val: any): void {
        if (this.existsAttributeFunctionSetter(attr)) {
            const that: any = this;
            that[this.self.getAttributeFunctionSetter(attr)](val);
        } else {
            this.attributes[attr] = val;
        }
    }

    public setAttributes(attributes: any) {
        attributes = pick(attributes, this.self.fillable);
        Object.keys(attributes).forEach((attribute: any) => {
            this.setAttribute(attribute, attributes[attribute]);
        });
    }

    public existsAttributeFunctionGetter(attr: string): boolean {
        const that: any = this;
        return typeof that[this.self.getAttributeFunctionGetter(attr)] === 'function';
    }

    public existsAttributeFunctionSetter(attr: string): boolean {
        const that: any = this;
        return typeof that[this.self.getAttributeFunctionSetter(attr)] === 'function';
    }

    public sync(attributes: any): any {
        this.exists = true;
        return this.attributes = attributes;
    }

    public save(options?: CreateItemOptions) {
        if (this.exists) {
            return new Promise((resolve: any, reject: any) => {
                const expected: any = {};
                expected[this.self.idColumn] = { Exists: true };
                options = { ...{ expected }, ...options };
                return this.self.dynogelModel.update(this.attributes, options, this.self.syncItem(resolve, reject, this));
            });
        }
        switch (this.self.idSchema) {
            case 'uuid':
            default:
                this.setAttribute(this.self.idColumn, uuidv4());
        }
        return new Promise((resolve: any, reject: any) => {
            this.self.dynogelModel.create(
                this.attributes, options, this.self.syncItem(resolve, reject, this)
            );
        });
    }

    public async update(attributes: any, options?: CreateItemOptions): Promise<any> {
        try {
            this.setAttributes(attributes);
            await this.save(options);
            return this;
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public destroy(): Promise<any> {
        return new Promise((resolve, reject) => {
            return this
                .self
                .dynogelModel
                .destroy(this.getAttribute(this.self.idColumn), this.self.toResult(resolve, reject));
        });
    }
}

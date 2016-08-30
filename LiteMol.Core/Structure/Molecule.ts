﻿/*
 * Copyright (c) 2016 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

namespace LiteMol.Core.Structure {
    "use strict";

    export class DataTableColumnDescriptor {
        constructor(public name: string, public creator: (size: number) => any) {
        }
    }

    export class DataTable {

        count: number;

        /*
         * Indices <0 .. count - 1>
         */
        indices: number[];        
        columns: DataTableColumnDescriptor[];

        clone() {
            let b = new DataTableBuilder(this.count),
                cols: { src: any[]; trg: any[] }[] = [];

            for (let c of this.columns) {
                cols[cols.length] = {
                    src: (<any>this)[c.name],
                    trg: b.addColumn(c.name, c.creator)
                };
            }

            for (let c of cols) {
                let s = c.src, t = c.trg;
                for (let i = 0, m = this.count; i < m; i++) {
                    t[i] = s[i];
                }
            }

            return b.seal();
        }

        getBuilder(count: number) {
            let b = new DataTableBuilder(count);
            for (let c of this.columns) {
                b.addColumn(c.name, c.creator);
            }
            return b;
        }

        getRawData(): any[][] {
            return this.columns.map(c => (<any>this)[c.name]);
        }

        constructor(count: number, source: DataTableBuilder) {
            this.count = count;
            this.indices = <any>new Int32Array(count);
            this.columns = [];

            for (let i = 0; i < count; i++) {
                this.indices[i] = i;
            }

            if (source) {
                for (let col of source.columns) {

                    let data = (<any>source)[col.name];
                    if (data instanceof Utils.ChunkedArrayBuilder) {
                        data = <any>(<Utils.ChunkedArrayBuilder<{}>><any>data).compact();
                    }
                    Object.defineProperty(this, col.name, { enumerable: true, configurable: false, writable: false, value: data });                    
                    this.columns[this.columns.length] = col;
                }
            }
        }
    }

    export class DataTableBuilder {
        count: number;

        columns: DataTableColumnDescriptor[] = [];
        
        addColumn<T>(name: string, creator: (size: number) => T): T {            
            let c = creator(this.count);
            Object.defineProperty(this, name, { enumerable: true, configurable: false, writable: false, value: c });
            this.columns[this.columns.length] = new DataTableColumnDescriptor(name, creator);
            return c;
        }

        getRawData(): any[][] {
            return this.columns.map(c => (<any>this)[c.name]);
        }
        
        /**
         * This functions clones the table and defines all its column inside the constructor, hopefully making the JS engine 
         * use internal class instead of dictionary representation.
         */
        seal<TTable extends DataTable>(): TTable {
            return <TTable>new DataTable(this.count, this);
        }

        constructor(count: number) {
            this.count = count;
        }
    }

    export enum EntityType {
        Polymer = 0,
        NonPolymer = 1,
        Water = 2,
        Unknown = 3
    }


    export enum BondOrder { None = 0, Single = 1, Double = 2, Triple = 3, Quadruple = 4 }

    export class ComponentBondInfoEntry {        

        map: Map<string, Map<string, BondOrder>> = new Map<string, Map<string, BondOrder>>();

        add(a: string, b: string, order: BondOrder, swap = true) {

            let e = this.map.get(a);
            if (e !== void 0) {
                let f = e.get(b);
                if (f === void 0) {
                    e.set(b, order);
                }
            } else {
                let map = new Map<string, BondOrder>();
                map.set(b, order);
                this.map.set(a, map);
            }

            if (swap) this.add(b, a, order, false);
        }

        constructor(public id: string) {
        }
    }

    export class ComponentBondInfo {
        entries: Map<string, ComponentBondInfoEntry> = new Map<string, ComponentBondInfoEntry>();

        newEntry(id: string) {
            let e = new ComponentBondInfoEntry(id);
            this.entries.set(id, e);
            return e;
        }
    }

    /**
     * Identifier for a reside that is a part of the polymer.
     */
    export class PolyResidueIdentifier {
        constructor(public asymId: string, public seqNumber: number, public insCode: string) { }


        static areEqual(a: PolyResidueIdentifier, index: number, bAsymId: string[], bSeqNumber: number[], bInsCode: string[]) {
            return a.asymId === bAsymId[index]
                && a.seqNumber === bSeqNumber[index]
                && a.insCode === bInsCode[index];
        }
        
        static compare(a: PolyResidueIdentifier, b: PolyResidueIdentifier) {
            if (a.asymId === b.asymId) {
                if (a.seqNumber === b.seqNumber) {
                    if (a.insCode === b.insCode) return 0;
                    if (a.insCode === void 0) return -1;
                    if (b.insCode === void 0) return 1;
                    return a.insCode < b.insCode ? -1 : 1;
                }
                return a.seqNumber < b.seqNumber ? -1 : 1;
            }
            return a.asymId < b.asymId ? -1 : 1;
        }

        static compareResidue(a: PolyResidueIdentifier, index:number, bAsymId: string[], bSeqNumber: number[], bInsCode: string[]) {
            if (a.asymId === bAsymId[index]) {
                if (a.seqNumber === bSeqNumber[index]) {
                    if (a.insCode === bInsCode[index]) return 0;
                    if (a.insCode === void 0) return -1;
                    if (bInsCode[index] === void 0) return 1;
                    return a.insCode < bInsCode[index] ? -1 : 1;
                }
                return a.seqNumber < bSeqNumber[index] ? -1 : 1;
            }
            return a.asymId < bAsymId[index] ? -1 : 1;
        }        
    }

    export const enum SecondaryStructureType { None = 0, Helix = 1, Turn = 2, Sheet = 3, AminoSeq = 4, Strand = 5 }

    export class SecondaryStructureElement {

        startResidueIndex: number = -1;
        endResidueIndex: number = -1;

        get length() {
            return this.endResidueIndex - this.startResidueIndex;
        }

        constructor(
            public type: SecondaryStructureType,
            public startResidueId: PolyResidueIdentifier,
            public endResidueId: PolyResidueIdentifier,
            public info: any = {}) {
        }
    }

    export class SymmetryInfo {
        constructor(
            public spacegroupName: string,
            public cellSize: number[],
            public cellAngles: number[],
            public toFracTransform: number[],
            public isNonStandardCrytalFrame: boolean) {
        }
    }

    /**
     * Wraps an assembly operator.
     */
    export class AssemblyOperator { constructor(public id: string, public name: string, public operator: number[]) { } }

    /**
     * Wraps a single assembly gen entry.
     */
    export class AssemblyGenEntry {
        constructor(public operators: string[][], public asymIds: string[]) { }
    }

    /**
     * Wraps an assembly generation template.
     */
    export class AssemblyGen { 
        gens: AssemblyGenEntry[] = [];        
        constructor(public name: string) { }
    }

    /**
     * Information about the assemblies.
     */
    export class AssemblyInfo {
        constructor(public operators: { [id: string]: AssemblyOperator }, public assemblies: AssemblyGen[]) {
        }
    }

    export interface PositionTableSchema extends DataTable {
        x: number[];
        y: number[];
        z: number[];
    }
    
    export interface DefaultAtomTableSchema extends DataTable {
        id: number[];
        name: string[];
        authName: string[];
        elementSymbol: string[];
        x: number[];
        y: number[];
        z: number[];
        altLoc: string[];
        occupancy: number[];
        tempFactor: number[];

        rowIndex: number[];
        
        residueIndex: number[];
        chainIndex: number[];
        entityIndex: number[];
    }

    export interface DefaultResidueTableSchema extends DataTable {        
        name: string[];
        seqNumber: number[];
        asymId: string[];
        authName: string[];
        authSeqNumber: number[];
        authAsymId: string[];
        insCode: string[];
        entityId: string[];

        isHet: number[];
        
        atomStartIndex: number[];
        atomEndIndex: number[];

        chainIndex: number[];
        entityIndex: number[];
        
        secondaryStructureIndex: number[];
    }

    export interface DefaultChainTableSchema extends DataTable {        
        asymId: string[];
        authAsymId: string[];
        entityId: string[];

        atomStartIndex: number[];
        atomEndIndex: number[];
        residueStartIndex: number[];
        residueEndIndex: number[];
        
        entityIndex: number[];

        // used by computed molecules (symmetry, assembly)
        sourceChainIndex?: number[];
        operatorIndex?: number[];
    }

    export interface DefaultEntityTableSchema extends DataTable {
        entityId: string[];
        entityType: EntityType[];

        atomStartIndex: number[];
        atomEndIndex: number[];
        residueStartIndex: number[];
        residueEndIndex: number[];
        chainStartIndex: number[];
        chainEndIndex: number[];
        type: string[];
    }

    export enum MoleculeModelSource {
        File,
        Computed
    }
    
    export class Operator {
        
        apply(v: Geometry.LinearAlgebra.ObjectVec3) {
            Geometry.LinearAlgebra.Matrix4.transformVector3(v, v, this.matrix)
        }
        
        static applyToModelUnsafe(matrix: number[], m: MoleculeModel) {
            let v = { x: 0.1, y: 0.1, z: 0.1};
            let {x,y,z} = m.atoms;
            for (let i = 0, _b = m.atoms.count; i < _b; i++) {
                v.x = x[i]; v.y = y[i]; v.z = z[i];
                Geometry.LinearAlgebra.Matrix4.transformVector3(v, v, matrix);
                x[i] = v.x; y[i] = v.y; z[i] = v.z;                
            }
        }
        
        constructor(public matrix: number[], public id: string, public isIdentity: boolean) {
            
        }
    }
    
    export class MoleculeModel {

        private _queryContext: Query.Context;

        get queryContext() {
            if (this._queryContext) return this._queryContext;
            this._queryContext = Query.Context.ofStructure(this);
            return this._queryContext;
        }

        query(q: Query.Source) {
            return Query.Builder.toQuery(q)(this.queryContext);
        }

        constructor(
            public id: string,
            public modelId: string,
            public atoms: DefaultAtomTableSchema,
            public residues: DefaultResidueTableSchema,
            public chains: DefaultChainTableSchema,
            public entities: DefaultEntityTableSchema,
            public componentBonds: ComponentBondInfo,
            public secondaryStructure: SecondaryStructureElement[],
            public symmetryInfo: SymmetryInfo,
            public assemblyInfo: AssemblyInfo,
            public parent: MoleculeModel,
            public source: MoleculeModelSource,
            public operators: Operator[]) {
            
        }
    }

    // TODO: refactor this into using a tree structure similar to what the plugin is using, query is then a transformation of the tree
    export class Molecule {

        constructor(
            public id: string,
            public models: MoleculeModel[]) {
        }
    }
}
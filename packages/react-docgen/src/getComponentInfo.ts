import * as Babel from '@babel/core';
import * as t from '@babel/types';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';

import { ComponentInfo, ComponentProp } from './types';
import { ComponentDoc, PropItem, withDefaultConfig, withCustomConfig } from './utils/docgen';
import { parseDefaultValue, parseDocBlock, parseType, getComponentFileInfo } from './utils/index';

/** Parameters used by the function to add custom properties to the returned component info. */
export interface ComponentInfoSchemaResolverParams {
  /** Path to current file */
  absPath: string;
  /** Shared properties of the component info */
  sharedComponentInfo: ComponentInfo;
  /** Object generated by `react-docgen-typescript` fork */
  componentDoc: ComponentDoc;
  /** `require`'d component function or class */
  Component: React.ComponentType;
  /** Babel parsed version of the file  */
  componentFile: t.File;
}

/** Resolver to add custom properties to the returned component info. */
export type ComponentInfoSchemaResolver<T extends ComponentInfo> = (params: ComponentInfoSchemaResolverParams) => T;

export interface GetComponentInfoOptions<T extends ComponentInfo = ComponentInfo> {
  /** Path to the file containing a single component. */
  filePath: string;
  /** Path to the tsconfig to use for processing the component file. Not used if `program` is provided. */
  tsconfigPath?: string;
  /**
   * Program containing the file. Providing this pre-initialized with all files which will be
   * docgen'd from a given package is an important perf optimization.
   */
  program?: ts.Program;
  /** Resolver to add custom properties to the returned component info. */
  schemaResolver?: ComponentInfoSchemaResolver<T>;
  /** Ignore props inherited from these interfaces. */
  ignoredParentInterfaces?: string[];
}

export function getComponentInfo<T extends ComponentInfo = ComponentInfo>(options: GetComponentInfoOptions): T {
  const { filePath, tsconfigPath, program, schemaResolver, ignoredParentInterfaces = [] } = options;

  const absPath = path.resolve(process.cwd(), filePath);

  const parser = tsconfigPath ? withCustomConfig(tsconfigPath, {}) : withDefaultConfig();
  const components = parser.parseWithProgramProvider(absPath, program && (() => program));

  if (!components.length) {
    throw new Error(`Could not find a component definition in "${filePath}".`);
  }
  if (components.length > 1) {
    throw new Error(
      [
        `Found more than one component definition in "${filePath}".`,
        'This is currently not supported; please ensure your module only defines a single React component.',
      ].join(' '),
    );
  }
  const componentDoc = components[0];

  // add exported Component info
  //
  // this 'require' instruction might break by producing partially initialized types - because of ts-node module's cache
  // used during processing - in that case we might consider to disable ts-node cache when running this command:
  // https://github.com/ReactiveX/rxjs/commit/2f86b9ddccbf020b2e695dd8fe0b79194efa3f56
  const Component: React.ComponentType | undefined = require(absPath).default;

  if (!Component) {
    throw new Error(`Component file "${absPath}" doesn't have a default export.`);
  }

  const componentFile = Babel.parse(fs.readFileSync(absPath).toString(), {
    configFile: false,
    presets: [['@babel/preset-typescript', { allExtensions: true, isTSX: true }]],
  }) as t.File;

  // replace the component.description string with a parsed docblock object
  const docblock = parseDocBlock(componentDoc.description);

  let props: ComponentProp[] = [];

  _.forEach(componentDoc.props, (propDef: PropItem, propName: string) => {
    const { description, tags } = parseDocBlock(propDef.description);
    const parentInterface = propDef?.parent?.name;

    // `propDef.parent` should be defined to avoid insertion of computed props
    const visibleInDefinition = propDef.parent && !_.includes(ignoredParentInterfaces, parentInterface);
    const visibleInTags = !_.find(tags, { title: 'docSiteIgnore' });

    if (visibleInDefinition && visibleInTags) {
      const types = parseType(componentFile, componentDoc.displayName, propName, propDef);
      const defaultValue = parseDefaultValue(Component, propDef, types);

      props.push({
        description,
        defaultValue,
        tags,
        types,
        name: propName,
        required: propDef.required,
      });
    }
  });

  // sort props
  props = _.sortBy(props, 'name');

  const sharedComponentInfo: ComponentInfo = {
    ...getComponentFileInfo(absPath),
    displayName: componentDoc.displayName,
    docblock,
    props,
  };

  if (schemaResolver) {
    return schemaResolver({ absPath, componentDoc, componentFile, Component, sharedComponentInfo }) as T;
  }
  return sharedComponentInfo as T;
}

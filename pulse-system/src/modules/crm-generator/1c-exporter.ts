import { convert } from 'xml-js';

export function convertTo1CXML(template: any): string {
  const modules = template.modules as any[];
  const config = {
    _declaration: { _attributes: { version: '1.0', encoding: 'UTF-8' } },
    Configuration: {
      _attributes: {
        xmlns: 'http://v8.1c.ru/8.3/MDclasses',
        'xmlns:xs': 'http://www.w3.org/2001/XMLSchema',
        name: template.name
      },
      Properties: {
        Name: { _text: template.name },
        Comment: { _text: template.description || '' }
      },
      ChildObjects: {
        ...modules.reduce((acc: any, module: any) => {
          acc[capitalizeFirst(module.type)] = generateModuleXML(module);
          return acc;
        }, {})
      }
    }
  };
  return convert.js2xml(config, { compact: true, spaces: 2 });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateModuleXML(module: any): any {
  const base: any = {
    _attributes: { name: module.name },
    Properties: { Name: { _text: module.name } }
  };
  if (module.fields?.length) {
    base.Attributes = {
      Attribute: module.fields.map((field: any) => ({
        _attributes: { name: field.name },
        Type: {
          _attributes: { 'xsi:type': 'StringType' },
          StringType: { Length: { _text: field.maxLength || 100 } }
        }
      }))
    };
  }
  return base;
}

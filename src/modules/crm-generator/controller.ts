import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import * as xmljs from 'xml-js';

export class CrmController {
  createTemplate = async (req: any, res: any, next: any) => {
    try {
      const template = await prisma.crmTemplate.create({
        data: {
          name: req.body.name,
          description: req.body.description,
          modules: req.body.modules || '[]',
          config: req.body.config || '{}',
          createdBy: req.user.id
        }
      });
      res.status(201).json({ template });
    } catch (error) { next(error); }
  };

  getTemplates = async (req: any, res: any, next: any) => {
    try {
      const templates = await prisma.crmTemplate.findMany({
        orderBy: { updatedAt: 'desc' }
      });
      res.json({ templates });
    } catch (error) { next(error); }
  };

  getTemplate = async (req: any, res: any, next: any) => {
    try {
      const template = await prisma.crmTemplate.findUnique({ where: { id: req.params.id } });
      if (!template) throw new AppError('Template not found', 404);
      res.json({ template });
    } catch (error) { next(error); }
  };

  updateTemplate = async (req: any, res: any, next: any) => {
    try {
      const data: any = {};
      if (req.body.name) data.name = req.body.name;
      if (req.body.description) data.description = req.body.description;
      if (req.body.modules) data.modules = req.body.modules;
      if (req.body.config) data.config = req.body.config;
      
      const template = await prisma.crmTemplate.update({
        where: { id: req.params.id },
        data
      });
      res.json({ template });
    } catch (error) { next(error); }
  };

  deleteTemplate = async (req: any, res: any, next: any) => {
    try {
      await prisma.crmTemplate.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) { next(error); }
  };

  exportTo1C = async (req: any, res: any, next: any) => {
    try {
      const template = await prisma.crmTemplate.findUnique({ where: { id: req.params.id } });
      if (!template) throw new AppError('Template not found', 404);
      
      let modules = [];
      try { modules = JSON.parse(template.modules || '[]'); } catch(e) {}
      
      const xmlContent = xmljs.js2xml({
        _declaration: { _attributes: { version: '1.0', encoding: 'UTF-8' } },
        Configuration: {
          _attributes: { xmlns: 'http://v8.1c.ru/8.3/MDclasses', name: template.name },
          Properties: { Name: { _text: template.name }, Comment: { _text: template.description || '' } },
          ChildObjects: modules.map((m: any) => ({
            [m.type === 'справочник' ? 'Catalog' : m.type === 'документ' ? 'Document' : m.type === 'регистр' ? 'InformationRegister' : 'Report']: {
              _attributes: { name: m.name },
              Properties: { Name: { _text: m.name } },
              Attributes: (m.fields || []).map((f: any) => ({
                _attributes: { name: f.name },
                Type: { StringType: { Length: { _text: 100 }, AllowedLength: { _text: 'Variable' } } }
              }))
            }
          })).reduce((acc: any, x: any) => { return { ...acc, ...x }; }, {})
        }
      }, { compact: true, spaces: 2 });
      
      await prisma.crmExport.create({
        data: { templateId: template.id, format: 'xml', content: xmlContent }
      });
      
      res.json({ xmlContent });
    } catch (error) { next(error); }
  };

  downloadExportFile = async (req: any, res: any, next: any) => {
    try {
      const template = await prisma.crmTemplate.findUnique({ where: { id: req.params.id } });
      if (!template) throw new AppError('Template not found', 404);
      
      let modules = [];
      try { modules = JSON.parse(template.modules || '[]'); } catch(e) {}
      
      const xmlContent = xmljs.js2xml({
        _declaration: { _attributes: { version: '1.0', encoding: 'UTF-8' } },
        Configuration: {
          _attributes: { name: template.name },
          Properties: { Name: { _text: template.name }, Comment: { _text: template.description || '' } },
          ChildObjects: {}
        }
      }, { compact: true, spaces: 2 });
      
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename=' + template.name.replace(/\s/g, '_') + '.xml');
      res.send(xmlContent);
    } catch (error) { next(error); }
  };

  getExports = async (req: any, res: any, next: any) => {
    try {
      const exports = await prisma.crmExport.findMany({
        include: { template: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ exports });
    } catch (error) { next(error); }
  };
}

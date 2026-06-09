import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { convertTo1CXML } from './1c-exporter';
import { validateCrmModule } from './validator';

export class CrmController {
  createTemplate = async (req: any, res: any, next: any) => {
    try {
      const { name, description, modules = [], config = {} } = req.body;
      const template = await prisma.crmTemplate.create({
        data: { name, description, modules, config, createdBy: req.user.id }
      });
      res.status(201).json({ template });
    } catch (error) { next(error); }
  };

  getTemplates = async (req: any, res: any, next: any) => {
    try {
      const templates = await prisma.crmTemplate.findMany({
        include: { exports: { take: 1, orderBy: { createdAt: 'desc' } } }
      });
      res.json({ templates });
    } catch (error) { next(error); }
  };

  getTemplate = async (req: any, res: any, next: any) => {
    try {
      const template = await prisma.crmTemplate.findUnique({
        where: { id: req.params.id }, include: { exports: true }
      });
      if (!template) throw new AppError('Template not found', 404);
      res.json({ template });
    } catch (error) { next(error); }
  };

  addModule = async (req: any, res: any, next: any) => {
    try {
      validateCrmModule(req.body);
      const template = await prisma.crmTemplate.findUnique({ where: { id: req.params.id } });
      if (!template) throw new AppError('Template not found', 404);
      const modules = [...(template.modules as any[]), req.body];
      const updated = await prisma.crmTemplate.update({ where: { id: req.params.id }, data: { modules } });
      res.json({ template: updated });
    } catch (error) { next(error); }
  };

  exportTo1C = async (req: any, res: any, next: any) => {
    try {
      const template = await prisma.crmTemplate.findUnique({ where: { id: req.params.id } });
      if (!template) throw new AppError('Template not found', 404);
      const xmlContent = convertTo1CXML(template);
      const export_ = await prisma.crmExport.create({
        data: { templateId: template.id, format: 'xml', content: xmlContent }
      });
      res.json({
        export: export_,
        downloadUrl: `/api/crm/exports/${export_.id}/download`
      });
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

  downloadExport = async (req: any, res: any, next: any) => {
    try {
      const export_ = await prisma.crmExport.findUnique({ where: { id: req.params.id } });
      if (!export_) throw new AppError('Export not found', 404);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="1c-crm-export.xml"`);
      res.send(export_.content);
    } catch (error) { next(error); }
  };
}

import { MeiliSearch } from 'meilisearch';
import { config } from '../../config';
import prisma from '../../config/database';

export class SearchController {
  private client: MeiliSearch;

  constructor() {
    this.client = new MeiliSearch({
      host: config.meilisearch.host,
      apiKey: config.meilisearch.apiKey
    });
  }

  globalSearch = async (req: any, res: any, next: any) => {
    try {
      const { q, index: indexName = 'employees' } = req.query;
      if (!q) return res.status(400).json({ error: 'Search query required' });
      const index = this.client.index(indexName);
      const results = await index.search(q, { limit: 20 });
      res.json({ query: q, results: results.hits, estimatedTotalHits: results.estimatedTotalHits });
    } catch (error) { next(error); }
  };

  reindex = async (req: any, res: any, next: any) => {
    try {
      const employees = await prisma.employee.findMany({ include: { user: true } });
      const employeeIndex = this.client.index('employees');
      await employeeIndex.addDocuments(employees.map(emp => ({
        id: emp.id, firstName: emp.user.firstName, lastName: emp.user.lastName,
        email: emp.user.email, position: emp.position, department: emp.department,
        phone: emp.phone, skills: emp.skills
      })));

      const infoItems = await prisma.infoItem.findMany({ include: { bank: true } });
      const infoIndex = this.client.index('info_items');
      await infoIndex.addDocuments(infoItems.map(item => ({
        id: item.id, title: item.title, content: item.content,
        tags: item.tags, bankName: item.bank.name
      })));

      res.json({ message: 'Reindex completed' });
    } catch (error) { next(error); }
  };
}

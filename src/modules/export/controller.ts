import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';

export class ExportController {
  exportEmployees = async (req: any, res: any, next: NextFunction) => {
    try {
      const { employees } = req.body;
      
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Employees');
      
      // Заголовки
      sheet.columns = [
        { header: 'Фамилия', key: 'lastName', width: 20 },
        { header: 'Имя', key: 'firstName', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Табельный номер', key: 'employeeId', width: 15 },
        { header: 'Должность', key: 'position', width: 25 },
        { header: 'Отдел', key: 'department', width: 20 },
        { header: 'Зарплата', key: 'salary', width: 15 },
        { header: 'Телефон', key: 'phone', width: 15 },
        { header: 'Навыки', key: 'skills', width: 30 },
        { header: 'Дата найма', key: 'hireDate', width: 15 }
      ];
      
      // Стиль заголовков
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF000000' }
      };
      headerRow.border = {
        bottom: { style: 'medium', color: { argb: 'FF000000' } }
      };
      
      // Данные
      (employees || []).forEach((emp: any) => {
        sheet.addRow({
          lastName: emp.user?.lastName || '',
          firstName: emp.user?.firstName || '',
          email: emp.user?.email || '',
          employeeId: emp.employeeId || '',
          position: emp.position || '',
          department: emp.department || '',
          salary: emp.salary || '',
          phone: emp.phone || '',
          skills: emp.skills || '',
          hireDate: emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('ru-RU') : ''
        });
      });
      
      // Автофильтр
      sheet.autoFilter = {
        from: 'A1',
        to: 'J' + ((employees?.length || 0) + 1)
      };
      
      // Отправляем файл
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      next(error);
    }
  };
}

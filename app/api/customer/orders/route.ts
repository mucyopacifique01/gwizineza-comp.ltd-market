import { db } from '@/lib/prisma';
import { requireCustomer } from '@/lib/customer-auth';
import { apiErrorResponse } from '@/lib/api-errors';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(){try{const customerId=requireCustomer();const orders=await db.order.findMany({where:{customerId},include:{items:true,payment:true},orderBy:{createdAt:'desc'},take:100});return Response.json({orders});}catch(e){return apiErrorResponse('customer/orders',e)}}
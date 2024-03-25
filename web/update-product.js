import { GraphqlQueryError } from '@shopify/shopify-api';
import shopify from "./shopify.js";
import * as mariadb from 'mariadb'



export default async function fetchAndUpdateDraftProducts(session) {
  const pool = mariadb.createPool(process.env.DATABASE_URL);
  const conn = await pool.getConnection();
  const data = await conn.query("SELECT * from cache");
  if (!data || !Array.isArray(data)) {
    return;
  }

  const alreadyVisited = new Set();

  for (const pricedSku of data) {
    const id = pricedSku.sku;
    if (alreadyVisited.has(id)) continue;
    alreadyVisited.add(id);

    const productData = data.filter((val) => val.sku === id).reduce((val, acc) => {
      if (val.code === 'price') acc.price = val.value;
      if (val.code === 'qty') acc.qty = val.value;
      if (val.code === 'compared_at') acc.compared_at_price = val.value;
    }, {});
    const product = new shopify.api.rest.Product({ session });
    product.id = product.sku;
    product.options = [productData];
    await product.saveAndUpdate();
  }
}

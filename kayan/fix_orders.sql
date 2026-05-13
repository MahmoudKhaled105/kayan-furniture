UPDATE item
SET status = 'sold'
WHERE id IN (
    SELECT o.item_id
    FROM sales_order o
    LEFT JOIN (
        SELECT order_id, SUM(amount) AS total_paid
        FROM order_payment
        GROUP BY order_id
    ) p ON p.order_id = o.id
    WHERE COALESCE(p.total_paid, 0) >= o.agreed_price
      AND o.status = 'active'
      AND o.item_id IS NOT NULL
);

UPDATE sales_order
SET status = 'fulfilled'
WHERE status = 'active'
  AND id IN (
    SELECT o.id
    FROM sales_order o
    LEFT JOIN (
        SELECT order_id, SUM(amount) AS total_paid
        FROM order_payment
        GROUP BY order_id
    ) p ON p.order_id = o.id
    WHERE COALESCE(p.total_paid, 0) >= o.agreed_price
  );

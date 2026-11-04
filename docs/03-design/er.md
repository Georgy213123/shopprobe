# Модель данных демо-витрины

У ShopProbe базы нет, только файлы отчёта.

```mermaid
erDiagram
  categories ||--o{ products : "содержит"
  categories {
    int id PK
    varchar slug UK
    varchar title
  }
  products {
    int id PK
    varchar slug UK
    varchar name
    int category_id FK
    varchar origin
    varchar form
    int price
    bool in_stock
  }
```

| Сущность | Что это |
|---|---|
| `categories` | тип чая, slug идёт в URL фильтра |
| `products` | товар, slug — адрес карточки, цена в рублях |
| `origin`, `form` | коды страны и формы со справочником в коде: значений шесть и три, таблицы не нужны |

Фасетный счётчик группы считается отдельным `GROUP BY` со всеми фильтрами, кроме фильтра
этой группы ([BUG-03](../06-bugs.md)).

from marshmallow import Schema, fields, validate, EXCLUDE


class AuthLoginSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    username = fields.Str(required=True, validate=validate.Length(min=3, max=128))
    password = fields.Str(required=True, validate=validate.Length(min=8, max=128))


class CreateOrderSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    customer_id = fields.Int(required=True)
    items = fields.List(fields.Dict(), required=True)
    total_amount = fields.Float(required=True)


class CreateProductSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    sku = fields.Str(required=True)
    name = fields.Str(required=True)
    price = fields.Float(required=True)


class CreateErrandSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    title = fields.Str(required=True)
    description = fields.Str(required=True)
    pickup_location = fields.Str(required=True)
    dropoff_location = fields.Str(required=True)

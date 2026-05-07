# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""make key_value.expires_on timezone-aware

Revision ID: 8a1f4d3e9b2c
Revises: ce6bd21901ab
Create Date: 2026-05-07 00:43:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "8a1f4d3e9b2c"
down_revision = "ce6bd21901ab"


def upgrade():
    with op.batch_alter_table("key_value") as batch_op:
        try:
            # PostgreSQL: existing values are naive UTC (because SQLAlchemy
            # strips tzinfo when storing into a TIMESTAMP WITHOUT TIME ZONE
            # column). Use ``AT TIME ZONE 'UTC'`` so they are reinterpreted
            # as UTC rather than as the server's local timezone.
            batch_op.alter_column(
                "expires_on",
                existing_type=sa.DateTime(),
                type_=sa.DateTime(timezone=True),
                existing_nullable=True,
                postgresql_using="expires_on AT TIME ZONE 'UTC'",
            )
        except TypeError:
            # Non-Postgres dialects don't accept ``postgresql_using``.
            batch_op.alter_column(
                "expires_on",
                existing_type=sa.DateTime(),
                type_=sa.DateTime(timezone=True),
                existing_nullable=True,
            )


def downgrade():
    with op.batch_alter_table("key_value") as batch_op:
        try:
            batch_op.alter_column(
                "expires_on",
                existing_type=sa.DateTime(timezone=True),
                type_=sa.DateTime(),
                existing_nullable=True,
                postgresql_using="expires_on AT TIME ZONE 'UTC'",
            )
        except TypeError:
            batch_op.alter_column(
                "expires_on",
                existing_type=sa.DateTime(timezone=True),
                type_=sa.DateTime(),
                existing_nullable=True,
            )

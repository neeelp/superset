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
"""make key_value.expires_on timezone aware

Revision ID: b3f7e2a91d4c
Revises: ce6bd21901ab
Create Date: 2026-05-07 01:30:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "b3f7e2a91d4c"
down_revision = "ce6bd21901ab"


def upgrade():
    """Convert key_value.expires_on to a timezone-aware DateTime column.

    Existing values were written as naive datetimes representing either local
    time (most call sites) or UTC (distributed_lock). Since these rows back
    short-lived locks and cache entries, any stale rows expire quickly after
    the migration runs. The column is altered in place; PostgreSQL interprets
    existing values using the session timezone (typically UTC for Superset
    deployments).
    """
    with op.batch_alter_table("key_value") as batch_op:
        batch_op.alter_column(
            "expires_on",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
        )


def downgrade():
    with op.batch_alter_table("key_value") as batch_op:
        batch_op.alter_column(
            "expires_on",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=True,
        )

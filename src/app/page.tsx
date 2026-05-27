"use client";

import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Table, Typography } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

interface Stats {
  totalGenerations: number;
  successCount: number;
  failCount: number;
  todayCount: number;
  avgDurationMs: number;
  providerStats: { provider: string; count: number }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <Title level={2}>Dashboard</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Generations" value={stats.totalGenerations} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Success" value={stats.successCount} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Failed" value={stats.failCount} prefix={<CloseCircleOutlined />} valueStyle={{ color: "#ff4d4f" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Today" value={stats.todayCount} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Avg Duration">
            <Statistic value={stats.avgDurationMs} suffix="ms" />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Provider Usage">
            <Table
              dataSource={stats.providerStats}
              rowKey="provider"
              pagination={false}
              size="small"
              columns={[
                { title: "Provider", dataIndex: "provider", key: "provider" },
                { title: "Count", dataIndex: "count", key: "count" },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/* eslint-disable */
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { IoTrashOutline } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { db } from "../../api/config";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

const AdminUpdatesPage = () => {
  const [version, setVersion] = useState("");
  const [content, setContent] = useState("");
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUpdates = async () => {
    try {
      const q = query(
        collection(db, "app_updates"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setUpdates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("업데이트 목록 조회 실패:", err);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!version.trim() || !content.trim()) {
      alert("버전과 업데이트 내용을 모두 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "app_updates"), {
        version: version.trim(),
        content: content.trim(),
        date: new Date().toISOString().slice(0, 10),
        createdAt: Timestamp.now(),
      });
      setVersion("");
      setContent("");
      await fetchUpdates();
    } catch (err) {
      console.error("업데이트 등록 실패:", err);
      alert("등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("이 버전을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "app_updates", id));
      await fetchUpdates();
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  return (
    <Container>
      <Title>앱 업데이트 관리</Title>

      <Card>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>버전</Label>
            <Input
              type="text"
              placeholder="1.0.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </FormGroup>
          <FormGroup>
            <Label>업데이트 내용</Label>
            <Textarea
              rows={3}
              placeholder="업데이트 내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </FormGroup>
          <SubmitButton type="submit" disabled={loading}>
            {loading ? "등록 중..." : "등록"}
          </SubmitButton>
        </Form>
      </Card>

      <Card>
        <SectionTitle>등록된 버전</SectionTitle>
        {updates.length === 0 ? (
          <EmptyText>등록된 업데이트가 없습니다.</EmptyText>
        ) : (
          updates.map((item) => (
            <UpdateItem key={item.id}>
              <UpdateInfo>
                <VersionBadge>v{item.version}</VersionBadge>
                <UpdateContent>{item.content}</UpdateContent>
                <UpdateDate>{item.date}</UpdateDate>
              </UpdateInfo>
              <DeleteButton onClick={() => handleDelete(item.id)}>
                <IoTrashOutline size={18} />
              </DeleteButton>
            </UpdateItem>
          ))
        )}
      </Card>
    </Container>
  );
};

export default AdminUpdatesPage;

// ─── Styled Components ───

const Container = styled.div``;

const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0 0 16px 0;
`;

const Card = styled.div`
  background: ${THEME.surface};
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid ${THEME.border};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.text};
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid ${THEME.border};
  border-radius: 4px;
  font-size: 14px;
  color: ${THEME.text};
  outline: none;

  &:focus {
    border-color: ${THEME.primary};
  }
`;

const Textarea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid ${THEME.border};
  border-radius: 4px;
  font-size: 14px;
  color: ${THEME.text};
  resize: vertical;
  outline: none;
  font-family: inherit;

  &:focus {
    border-color: ${THEME.primary};
  }
`;

const SubmitButton = styled.button`
  padding: 10px 0;
  background: ${THEME.primary};
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SectionTitle = styled.h2`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
  margin: 0 0 12px 0;
`;

const EmptyText = styled.p`
  font-size: 13px;
  color: ${THEME.muted};
  text-align: center;
  padding: 20px 0;
  margin: 0;
`;

const UpdateItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid ${THEME.border};

  &:last-child {
    border-bottom: none;
  }
`;

const UpdateInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
`;

const VersionBadge = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.primary};
`;

const UpdateContent = styled.span`
  font-size: 13px;
  color: ${THEME.text};
  white-space: pre-wrap;
  word-break: break-word;
`;

const UpdateDate = styled.span`
  font-size: 12px;
  color: ${THEME.muted};
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: ${THEME.muted};
  cursor: pointer;
  padding: 6px;
  margin-left: 8px;
  flex-shrink: 0;

  &:hover {
    color: ${THEME.danger};
  }
`;
